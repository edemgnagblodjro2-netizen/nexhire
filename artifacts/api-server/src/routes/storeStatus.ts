import { Router } from "express";
import { createPrivateKey, sign as cryptoSign } from "node:crypto";
import { logger } from "../lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/store-status
//
// Returns the current iOS App Store and Android Play Store status for the
// AttenteZéro app. Requires admin key. Results are cached server-side for
// 5 minutes to avoid hammering the ASC API.
//
// iOS data:  App Store Connect API (JWT signed with APP_STORE_CONNECT_* secrets)
// Android:   Public Play Store page scrape (best-effort, no credentials needed)
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

const ASC_APP_ID = "6766750916";
const ANDROID_PACKAGE = "com.attentezero.app";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type StoreVersion = {
  version: string;
  state: string;
  stateLabel: string;
  stateSeverity: "live" | "review" | "pending" | "rejected" | "unknown";
  updatedAt?: string;
};

type StoreStatus = {
  ios: {
    live: StoreVersion | null;
    inReview: StoreVersion | null;
    fetchedAt: string;
    error?: string;
  };
  android: {
    live: StoreVersion | null;
    fetchedAt: string;
    error?: string;
    storeUrl: string;
  };
};

let cache: { data: StoreStatus; expiresAt: number } | null = null;

function requireAdminKey(req: any, res: any, next: any) {
  const adminKey = process.env.ADMIN_API_KEY;
  const provided = req.headers["x-admin-key"];
  if (!adminKey || provided !== adminKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── ASC JWT generation ──────────────────────────────────────────────────────

function generateAscJwt(): string {
  const keyId = process.env.APP_STORE_CONNECT_KEY_ID;
  const issuerId = process.env.APP_STORE_CONNECT_ISSUER_ID;
  const privateKeyRaw = process.env.APP_STORE_CONNECT_PRIVATE_KEY;

  if (!keyId || !issuerId || !privateKeyRaw) {
    throw new Error("Missing APP_STORE_CONNECT_* environment variables");
  }

  // Defensively normalize the PEM: some secret managers store literal "\n"
  // instead of actual newline characters. createPrivateKey requires real newlines.
  const privateKeyPem = privateKeyRaw.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(
    JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" })
  ).toString("base64url");

  const payload = Buffer.from(
    JSON.stringify({
      iss: issuerId,
      iat: now,
      exp: now + 1200, // 20 min expiry
      aud: "appstoreconnect-v1",
    })
  ).toString("base64url");

  const data = `${header}.${payload}`;

  const privateKey = createPrivateKey(privateKeyPem);
  // ECDSA P-256: sign with SHA-256, encode in IEEE P1363 (raw r||s, required by ASC)
  const signature = cryptoSign("sha256", Buffer.from(data), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");

  return `${data}.${signature}`;
}

// ── App Store state → human label + severity ────────────────────────────────

function mapAscState(state: string): {
  label: string;
  severity: StoreVersion["stateSeverity"];
} {
  switch (state) {
    case "READY_FOR_SALE":
      return { label: "En ligne", severity: "live" };
    case "IN_REVIEW":
      return { label: "En revue Apple", severity: "review" };
    case "WAITING_FOR_REVIEW":
      return { label: "En attente de revue", severity: "review" };
    case "PENDING_DEVELOPER_RELEASE":
      return { label: "Approuvée — publication manuelle", severity: "pending" };
    case "PENDING_APPLE_RELEASE":
      return { label: "Approuvée — publication Apple", severity: "pending" };
    case "REJECTED":
      return { label: "Refusée par Apple", severity: "rejected" };
    case "DEVELOPER_REJECTED":
      return { label: "Retirée (développeur)", severity: "unknown" };
    case "PREPARE_FOR_SUBMISSION":
      return { label: "En préparation", severity: "unknown" };
    case "PROCESSING_FOR_DISTRIBUTION":
      return { label: "En traitement", severity: "pending" };
    case "REPLACED_WITH_NEW_VERSION":
      return { label: "Remplacée", severity: "unknown" };
    default:
      return { label: state, severity: "unknown" };
  }
}

// ── Fetch iOS status from App Store Connect API ──────────────────────────────

async function fetchIosStatus(): Promise<StoreStatus["ios"]> {
  const fetchedAt = new Date().toISOString();
  try {
    const jwt = generateAscJwt();

    // Fetch up to 10 iOS versions sorted by creation date descending (newest first).
    // Explicit sort is required — ASC API ordering is not guaranteed by default.
    const url = new URL(
      `https://api.appstoreconnect.apple.com/v1/apps/${ASC_APP_ID}/appStoreVersions`
    );
    url.searchParams.set("filter[platform]", "IOS");
    url.searchParams.set("limit", "10");
    url.searchParams.set("sort", "-createdDate"); // descending: newest first
    url.searchParams.set(
      "fields[appStoreVersions]",
      "versionString,appStoreState,createdDate,releaseType"
    );

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ASC API ${res.status}: ${text.slice(0, 200)}`);
    }

    const json: any = await res.json();
    const versions: any[] = json.data ?? [];

    let live: StoreVersion | null = null;
    let inReview: StoreVersion | null = null;

    for (const v of versions) {
      const attrs = v.attributes ?? {};
      const state: string = attrs.appStoreState ?? "";
      const { label, severity } = mapAscState(state);
      const entry: StoreVersion = {
        version: attrs.versionString ?? "?",
        state,
        stateLabel: label,
        stateSeverity: severity,
        updatedAt: attrs.createdDate,
      };

      if (severity === "live" && !live) {
        live = entry;
      } else if (
        (severity === "review" || severity === "pending" || severity === "rejected") &&
        !inReview
      ) {
        inReview = entry;
      }

      if (live && inReview) break;
    }

    return { live, inReview, fetchedAt };
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch iOS store status");
    return { live: null, inReview: null, fetchedAt, error: err?.message ?? String(err) };
  }
}

// ── Fetch Android live version from Play Store page ──────────────────────────

async function fetchAndroidStatus(): Promise<StoreStatus["android"]> {
  const fetchedAt = new Date().toISOString();
  const storeUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&hl=fr&gl=CA`;

  try {
    const res = await fetch(storeUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "fr-CA,fr;q=0.9",
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      throw new Error(`Play Store HTTP ${res.status}`);
    }

    const html = await res.text();

    // The version string appears in the page as [[["X.Y.Z"]]] inside the page's
    // embedded JS data. We use a regex that looks for the package's version
    // near its identifier.
    const versionMatch =
      html.match(/"softwareVersion":"([^"]+)"/) ||
      html.match(/\[\[\["(\d+\.\d+[\d.]*)"/)  ||
      html.match(/currentVersion[^>]*>([^<]+)</) ||
      html.match(/"(\d+\.\d+\.\d+(?:\.\d+)?)"/);

    const version = versionMatch?.[1] ?? null;

    if (!version) {
      return {
        live: null,
        fetchedAt,
        storeUrl,
        error: "Version non trouvée dans la page Play Store",
      };
    }

    return {
      live: {
        version,
        state: "PUBLISHED",
        stateLabel: "En ligne",
        stateSeverity: "live",
      },
      fetchedAt,
      storeUrl,
    };
  } catch (err: any) {
    logger.warn({ err }, "Failed to fetch Android Play Store status");
    return {
      live: null,
      fetchedAt,
      storeUrl,
      error: err?.message ?? String(err),
    };
  }
}

// ── Route ───────────────────────────────────────────────────────────────────

router.get("/admin/store-status", requireAdminKey, async (_req, res) => {
  // Serve from cache if fresh
  if (cache && cache.expiresAt > Date.now()) {
    res.json(cache.data);
    return;
  }

  const [ios, android] = await Promise.all([
    fetchIosStatus(),
    fetchAndroidStatus(),
  ]);

  const data: StoreStatus = { ios, android };
  cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };

  res.json(data);
});

export default router;
