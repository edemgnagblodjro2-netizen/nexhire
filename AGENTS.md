# AGENTS.md

Guidance for AI agents working in the CivicAI / AttenteZéro monorepo.

## Cursor Cloud specific instructions

### Monorepo overview

- **Package manager:** `pnpm@10.26.1` only (`npm`/`yarn` blocked by root `preinstall`).
- **Quality gate:** `pnpm run typecheck` (there is **no** root `lint` script; Prettier is available via `pnpm exec prettier`).
- **Primary product:** AttenteZéro (`artifacts/service-qc` mobile, `artifacts/api-server`, `artifacts/admin`).
- **Other artifacts:** `civicai-site`, `constructpro-erp`, `tenant-portal`, `nexhire` (separate server), `mockup-sandbox` (dev-only).

See `replit.md` for product context and env var names.

### Local PostgreSQL (Cloud VM)

Replit provisions Postgres automatically; on Cursor Cloud VMs install and start PostgreSQL 16 yourself, then use a dev URL such as:

`postgresql://civicai_dev:civicai_dev@localhost:5432/civicai`

Apply schema after `DATABASE_URL` is set:

```bash
pnpm exec drizzle-kit push --config ./lib/db/drizzle.config.ts
```

(`pnpm --filter @workspace/db run push` is equivalent.)

### API server startup gotchas

1. **Required env:** `PORT` (e.g. `8080`), `DATABASE_URL`, `ADMIN_API_KEY`, and **`B2G_API_KEY` must differ** from `ADMIN_API_KEY` or the process exits.
2. **OpenAI integration:** Import of `@workspace/integrations-openai-ai-server` throws unless both `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY` are set. For local dev without Replit integrations, placeholders pointing at `https://api.openai.com/v1` are enough to boot; AI routes will fail at runtime without a real key.
3. **Admin static fallback crash:** If `artifacts/admin/dist/public` is missing, `app.ts` registers `GET /admin/:rest(.*)`, which **crashes Express 5 / path-to-regexp v8** on startup. **Workaround:** run `BASE_PATH=/admin/ pnpm --filter @workspace/admin run build` before starting the API, or use the Vite admin dev server (below) and ignore `/admin` on the API.
4. **`pnpm --filter @workspace/api-server run dev`** runs `build` then `start` (not watch). Expect ~1s rebuild per restart; it also runs `fuser -k` on `PORT`.
5. **Stripe:** Replit connector vars are optional; startup logs a warning if Stripe is unreachable.

### Recommended dev commands (AttenteZéro)

| Service | Command | Port |
|--------|---------|------|
| API | `PORT=8080 pnpm --filter @workspace/api-server run dev` | 8080 |
| Admin (Vite) | `PORT=23744 BASE_PATH=/admin/ pnpm --filter @workspace/admin run dev` | 23744 |

Admin Vite proxies `/api` → `http://localhost:8080`. Default admin key in `.replit` `[userenv.shared]` is `attentezero-admin-2026` (local dev only).

**Smoke checks:**

```bash
curl -s http://localhost:8080/api/healthz
curl -s -H "x-admin-key: attentezero-admin-2026" http://localhost:8080/api/admin/services/meta
curl -s "http://localhost:8080/api/services?limit=3"
```

### Other apps (no DB)

```bash
PORT=23745 BASE_PATH=/ pnpm --filter @workspace/civicai-site run dev
PORT=23747 BASE_PATH=/constructpro-erp/ pnpm --filter @workspace/constructpro-erp run dev
```

### Tests

- No Jest/Playwright suite in-repo.
- `pnpm --filter @workspace/scripts run test-isolation` needs `DATABASE_URL`.
- Full `pnpm run typecheck` currently fails in `artifacts/api-server` (pre-existing `AuthUser` / tenant typing errors) — other packages typecheck.

### Long-running processes

Use **tmux** (`tmux -f /exec-daemon/tmux.portal.conf`) for API/admin dev servers so sessions survive backgrounding.

### Data seeding

- `AUTO_SEED_SERVICES=1` on API boot is opt-in.
- `pnpm --filter @workspace/scripts run seed-services` bulk-loads ~7k rows and may hit Postgres bind limits on a fresh VM; prefer admin UI or small SQL inserts for smoke data.
