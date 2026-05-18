import { Router } from "express";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findArticle } from "../data/blogArticles";
import { logger } from "../lib/logger";

// __dirname equivalent for ESM — this file lives in dist/ at runtime,
// so ../../civicai-site resolves to the civicai-site artifact directory.
const __dirname = dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// CivicAI blog SSR — dynamic meta-tag injection for social crawlers.
//
// GET /blog/:slug
//   Intercepts individual blog post URLs, detects the requested language from
//   the Accept-Language header, looks up the article metadata, and injects
//   article-specific <title>, <meta name="description">, og:* and twitter:*
//   tags into the blog.html shell before returning it.  Social crawlers
//   (LinkedIn, WhatsApp, X/Twitter) see the per-article tags; regular browsers
//   then boot the Vite SPA which re-renders the page client-side.
//
//   Falls back to the unmodified blog.html for unknown slugs.
// ─────────────────────────────────────────────────────────────────────────────

const CANONICAL_ORIGIN = "https://www.attentezero.ca";

async function readBlogHtml(): Promise<string | null> {
  // At runtime, compiled code lives in artifacts/api-server/dist/, so
  // __dirname is .../artifacts/api-server/dist.  The civicai-site is two
  // levels up from there.  We also try workspace-root-relative paths as a
  // safety net.
  const candidates = [
    resolve(__dirname, "../../civicai-site/dist/public/blog.html"),
    resolve(__dirname, "../../civicai-site/blog.html"),
    resolve(__dirname, "../../../civicai-site/dist/public/blog.html"),
    resolve(__dirname, "../../../civicai-site/blog.html"),
  ];
  for (const p of candidates) {
    try {
      return await readFile(p, "utf-8");
    } catch {
      // try next candidate
    }
  }
  return null;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface Substitution {
  name: string;
  pattern: RegExp;
  replacement: string;
}

function injectMeta(
  html: string,
  slug: string,
  title: string,
  description: string,
): { result: string; missed: string[] } {
  const safeTitle = escapeAttr(title);
  const safeDesc = escapeAttr(description);
  const canonicalUrl = `${CANONICAL_ORIGIN}/blog/${slug}`;
  const pageTitle = `${title} — Blog CivicAI`;
  const safePage = escapeAttr(pageTitle);

  const substitutions: Substitution[] = [
    { name: "title", pattern: /<title>[^<]*<\/title>/, replacement: `<title>${safePage}</title>` },
    { name: "meta:description", pattern: /(<meta\s+name="description"\s+content=")[^"]*(")/,  replacement: `$1${safeDesc}$2` },
    { name: "link:canonical", pattern: /(<link\s+rel="canonical"\s+href=")[^"]*(")/,           replacement: `$1${canonicalUrl}$2` },
    { name: "og:title",       pattern: /(<meta\s+property="og:title"\s+content=")[^"]*(")/,       replacement: `$1${safePage}$2` },
    { name: "og:description", pattern: /(<meta\s+property="og:description"\s+content=")[^"]*(")/,  replacement: `$1${safeDesc}$2` },
    { name: "og:url",         pattern: /(<meta\s+property="og:url"\s+content=")[^"]*(")/,          replacement: `$1${canonicalUrl}$2` },
    { name: "twitter:title",       pattern: /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,       replacement: `$1${safePage}$2` },
    { name: "twitter:description", pattern: /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,  replacement: `$1${safeDesc}$2` },
  ];

  const missed: string[] = [];
  let result = html;

  for (const { name, pattern, replacement } of substitutions) {
    if (!pattern.test(result)) {
      missed.push(name);
    } else {
      result = result.replace(pattern, replacement);
    }
  }

  return { result, missed };
}

function detectLang(acceptLanguage: string | undefined): "fr" | "en" {
  if (!acceptLanguage) return "fr";
  const lower = acceptLanguage.toLowerCase();
  if (lower.startsWith("en") || lower.includes(",en") || lower.includes(";en")) return "en";
  return "fr";
}

const router = Router();

router.get("/blog/:slug", async (req, res) => {
  const { slug } = req.params;
  const article = findArticle(slug);

  const html = await readBlogHtml();
  if (!html) {
    req.log?.error("blog SSR: blog.html template not found — civicai-site may not be built");
    res.status(503).send("Blog template unavailable");
    return;
  }

  if (!article) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
    return;
  }

  const lang = detectLang(req.headers["accept-language"]);
  const title = lang === "en" ? article.titleEn : article.titleFr;
  const description = lang === "en" ? article.excerptEn : article.excerptFr;

  const { result: injected, missed } = injectMeta(html, slug, title, description);

  if (missed.length > 0) {
    logger.warn(
      { slug, missed },
      "blog SSR: some meta-tag patterns did not match — blog.html template may have drifted",
    );
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  res.send(injected);
});

export default router;
