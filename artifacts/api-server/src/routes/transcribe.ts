import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { openai } from "@workspace/integrations-openai-ai-server";
import { Readable } from "stream";

const router = Router();

// ── Limits ───────────────────────────────────────────────────────
// Whisper-1 hard cap is 25 MB. We cap at 10 MB which is plenty for ~10
// minutes of voice memo audio and protects RAM on the API container.
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

// MIME allowlist — must match what Expo expo-av / iOS / Android Whisper-1
// accepts. We refuse anything unexpected to avoid feeding arbitrary uploads
// to a paid API.
const ALLOWED_MIME = new Set([
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/3gpp",
]);

// Per-user rate limit: 5 transcriptions per rolling 10-minute window.
// Reduced from 30 to prevent a single self-registered account from forcing
// ~300 MB of concurrent upload buffers in one burst.
// In-memory map keyed by userId — fine for single-instance deploy. If we ever
// scale horizontally, swap for Redis.
const RL_WINDOW_MS = 10 * 60 * 1000;
const RL_MAX = 5;
const rlBuckets = new Map<string, number[]>();

// Per-user concurrency cap: at most 2 uploads buffered in RAM at once.
// This prevents 30 parallel 10 MB uploads from the same account, regardless
// of whether they'd individually pass the rolling rate limit.
const MAX_CONCURRENT_PER_USER = 2;
const activeUploads = new Map<string, number>();

function rateLimit(userId: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = (rlBuckets.get(userId) || []).filter((t) => now - t < RL_WINDOW_MS);
  if (bucket.length >= RL_MAX) {
    const retryAfterSec = Math.ceil((RL_WINDOW_MS - (now - bucket[0])) / 1000);
    rlBuckets.set(userId, bucket);
    return { ok: false, retryAfterSec };
  }
  bucket.push(now);
  rlBuckets.set(userId, bucket);
  // Periodic GC to keep the map bounded (drop empty buckets every ~1k inserts).
  if (rlBuckets.size > 1000) {
    for (const [k, v] of rlBuckets) {
      const live = v.filter((t) => now - t < RL_WINDOW_MS);
      if (live.length === 0) rlBuckets.delete(k);
      else rlBuckets.set(k, live);
    }
  }
  return { ok: true, retryAfterSec: 0 };
}

// ── Middleware ───────────────────────────────────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentification requise pour la transcription vocale." });
    return;
  }
  next();
}

// Rate-limit check runs BEFORE multer so that over-quota requests are
// rejected immediately — without allocating up to 10 MB of RAM for the
// upload body first.
function requireRateLimit(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id;
  const rl = rateLimit(userId);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfterSec));
    res.status(429).json({
      error: `Limite de transcriptions atteinte. Réessayez dans ${rl.retryAfterSec} secondes.`,
    });
    return;
  }
  next();
}

// Concurrency guard: reject if this user already has MAX_CONCURRENT_PER_USER
// uploads buffered in memory. Runs BEFORE multer for the same reason as above.
function requireConcurrencySlot(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id;
  const current = activeUploads.get(userId) ?? 0;
  if (current >= MAX_CONCURRENT_PER_USER) {
    res.status(429).json({
      error: `Trop de transcriptions simultanées. Attendez la fin d'une requête en cours.`,
    });
    return;
  }
  activeUploads.set(userId, current + 1);
  // Decrement exactly once when the response ends (finish covers normal
  // completion; close covers aborted connections that never emit finish).
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const n = (activeUploads.get(userId) ?? 1) - 1;
    if (n <= 0) activeUploads.delete(userId);
    else activeUploads.set(userId, n);
  };
  res.on("finish", release);
  res.on("close", release);
  next();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AUDIO_BYTES,
    files: 1,
    fields: 5,
  },
});

// Wrap multer so we can catch its LIMIT_FILE_SIZE error cleanly.
function uploadOne(req: Request, res: Response, next: NextFunction) {
  upload.single("audio")(req, res, (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: `Fichier trop volumineux (max ${MAX_AUDIO_BYTES / 1024 / 1024} Mo).` });
        return;
      }
      res.status(400).json({ error: "Téléversement audio invalide." });
      return;
    }
    next();
  });
}

// ── Route ────────────────────────────────────────────────────────
// Order: requireAuth → requireRateLimit → requireConcurrencySlot → uploadOne → handler
// Both guards run before multer so rejected requests never touch RAM.
router.post("/ai/transcribe", requireAuth, requireRateLimit, requireConcurrencySlot, uploadOne, async (req, res) => {
  const userId = req.user!.id;

  try {
    if (!req.file) {
      res.status(400).json({ error: "Fichier audio requis." });
      return;
    }
    // MIME validation. multer infers from the multipart Content-Type the
    // client sent; we don't trust it blindly but it's a reasonable first gate.
    const mime = (req.file.mimetype || "").toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      res.status(415).json({ error: `Format audio non supporté (${mime || "inconnu"}).` });
      return;
    }
    if (req.file.size === 0) {
      res.status(400).json({ error: "Fichier audio vide." });
      return;
    }

    const language = (req.body.language as string) || "fr";
    const langMap: Record<string, string> = {
      fr: "fr",
      en: "en",
      es: "es",
      ar: "ar",
      ht: "fr",
    };

    const audioStream = Readable.from(req.file.buffer);
    (audioStream as unknown as { path: string }).path =
      req.file.originalname || "audio.m4a";

    const transcription = await openai.audio.transcriptions.create({
      file: audioStream as unknown as File,
      model: "whisper-1",
      language: langMap[language] || "fr",
      response_format: "json",
    });

    res.json({ text: transcription.text });
  } catch (err) {
    console.error("[transcribe] error:", err);
    res.status(500).json({ error: "Échec de la transcription." });
  }
});

export default router;
