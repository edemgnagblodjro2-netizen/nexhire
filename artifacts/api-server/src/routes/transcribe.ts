import { Router } from "express";
import multer from "multer";
import { openai } from "@workspace/integrations-openai-ai-server";
import { Readable } from "stream";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.post("/ai/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "audio file is required" });
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
    res.status(500).json({ error: "Transcription failed" });
  }
});

export default router;
