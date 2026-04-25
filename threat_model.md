# Threat Model

## Project Overview

AttenteZéro is a pnpm monorepo for a Quebec-focused aid-finding platform. Production scope centers on an Express API (`artifacts/api-server`) consumed by an Expo mobile app (`artifacts/service-qc`) and a Vite admin/organisation web app (`artifacts/admin`). The system stores user accounts, sessions, organisation/subscription records, service analytics, and crowdsourced wait-time reports in PostgreSQL via Drizzle, and integrates with Replit OIDC, Stripe, and OpenAI.

Production assumptions for this scan:
- Only production-reachable code matters.
- `NODE_ENV` is `production` in deployed environments.
- Replit-managed TLS protects client/server traffic in production.
- Replit-hosted deployment domains such as `*.replit.app`, `*.replit.dev`, and `*.repl.co` are Public Suffix List entries, so arbitrary sibling deployments should not be assumed to share same-site cookie context.
- `artifacts/mockup-sandbox` is dev-only unless separate production reachability is demonstrated.
- Retired B2B route files kept on disk but not mounted from `artifacts/api-server/src/routes/index.ts` are out of production scope unless remounted.

## Assets

- **User accounts and sessions** — email addresses, password hashes, OIDC-linked identities, bearer session tokens, and session cookies. Compromise enables account takeover and access to profile, billing, and AI usage state.
- **Organisation and subscription data** — organisation profiles, billing customer/subscription identifiers, verification requests, plan state, and badge status. Compromise can expose billing information, allow subscription tampering, or create cross-tenant impact.
- **Service interaction analytics** — service view/call/click events, B2G aggregates, and wait-time submissions. These metrics are privacy-sensitive because low-volume regional signals can reveal behaviour patterns.
- **Application secrets** — database URL, Stripe secret/webhook secret, OIDC client identifiers, OpenAI API key, wait-report salt, and admin API key. Leakage would enable impersonation, billing abuse, or direct infrastructure compromise.
- **Admin browser-held credentials** — the current admin flow stores the shared admin API key in browser storage. Any same-origin script execution on the deployment origin can expose that key and collapse all admin-key-protected routes.
- **AI/transcription quota and spend controls** — OpenAI-backed chat/transcription endpoints can incur direct cost and can expose sensitive user prompts or audio if boundaries are weak.

## Trust Boundaries

- **Mobile/browser to API** — all client input is untrusted. Every protected route must authenticate and authorize server-side; client-supplied identifiers must never define tenant or billing scope by themselves.
- **API to PostgreSQL** — the API has broad read/write access to sensitive tables. Injection or broken authz at the API layer would expose all stored data.
- **API to Stripe** — Stripe calls are privileged and can create checkout or billing portal sessions and consume webhook events. Requests that influence Stripe actions must be bound to the authenticated principal or validated webhook source.
- **API to OpenAI** — AI and transcription routes spend money and may process sensitive user content. Public access must be bounded by trustworthy rate limiting and quota checks.
- **Public vs authenticated vs admin** — public service discovery, wait-time reads/writes, and some chat access coexist with authenticated profile/organisation/billing flows and admin-key-gated dashboards. These boundaries must be explicit and enforced server-side.
- **Same-origin public HTML vs admin SPA** — public HTML responses such as Stripe receipt pages share origin with `/admin`, so any reflected or stored XSS on a public page can interact with browser storage used by the admin app.
- **Hosted-origin isolation** — Replit sibling subdomains are not automatically trusted browser peers; future scans should not infer same-site cookie reachability across unrelated `*.replit.app` / `*.replit.dev` / `*.repl.co` origins without additional deployment-specific evidence.
- **Dev-only vs production** — mockup sandbox code, build scripts, and archived but unmounted B2B routes should generally be excluded from production findings unless reachable from mounted routes or deployment config.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/index.ts`
- **Highest-risk server areas:** `artifacts/api-server/src/routes/auth.ts`, `stripe.ts`, `ai.ts`, `transcribe.ts`, `services.ts`, `organisations.ts`, `verifications.ts`, `b2g.ts`
- **Public surfaces:** `/api/services`, `/api/services/:id/track`, `/api/services/:id/wait`, `/api/mobile-auth/*`, `/api/referrals/*`, `/api/bug-reports`, `/api/search-events`, `/api/stripe/payment-success`, `/api/stripe/session-receipt`, `/api/stripe/subscription-status`, and likely `/api/ai/chat`
- **Authenticated surfaces:** `/api/auth/user`, `/api/mobile-auth/update-profile`, `/api/organisations/me*`, `/api/stripe/user-portal`, `/api/org/verification/*`, `/api/ai/transcribe`
- **Admin-key surfaces:** `/api/admin/services*`, `/api/b2g/*`, `/api/admin/verification/*`, `/api/admin/search-stats`, `/api/admin/referrals`, `/api/bug-reports`, and the `/admin` SPA that stores and replays the key
- **Usually dev-only / ignore unless proven reachable:** `artifacts/mockup-sandbox/**`, `artifacts/service-qc/scripts/**`, archived route files not mounted from `routes/index.ts`

## Current Hotspots For Future Scans

- **Password reset remains a primary takeover surface** — `artifacts/api-server/src/routes/auth.ts` and `lib/db/src/schema/auth.ts` currently use 6-digit reset codes with IP-based throttling. Future scans should always revisit per-account attempt caps, token invalidation, and code entropy here.
- **Verification request links are security-sensitive because they land in `/admin`** — `artifacts/api-server/src/routes/verifications.ts` feeds attacker-controlled URLs into `artifacts/admin/src/pages/Verifications.tsx`. Any executable scheme or navigation gadget is high risk because the admin SPA stores the shared admin key in browser storage.
- **B2G authorization is still key-based, not tenant-scoped** — `artifacts/api-server/src/routes/b2g.ts` uses a single global partner secret and accepts region selection from request parameters. Future scans should continue checking for cross-tenant analytics exposure until per-tenant scoping is implemented.
- **Crowdsourced wait-time data should be treated as attacker-influenced input** — `artifacts/api-server/src/routes/wait.ts` and the B2G live-wait aggregation in `artifacts/api-server/src/routes/b2g.ts` need integrity review whenever the product increases operational reliance on these signals.
- **Stripe webhook processing must fail closed** — `artifacts/api-server/src/routes/stripe.ts` is a standing hotspot because billing state is mutated from webhook events. Future scans should confirm signature verification is mandatory in every production path.

## Threat Categories

### Spoofing

Authentication relies on Replit OIDC plus custom email/password sessions stored in the `sessions` table. The API must only accept identities derived from verified OIDC responses or valid stored sessions, and admin-only features must never trust caller-supplied headers or body fields without a secret or authenticated ownership check.

### Tampering

The client controls many identifiers such as `organisationId`, `serviceId`, plan selections, and analytics inputs. Server routes that trigger Stripe actions, update profiles, record wait times, or mutate service records must bind those actions to the authenticated principal and validate that the caller is authorized for the referenced tenant or object.

### Information Disclosure

The system handles account data, organisation records, billing metadata, analytics, and user-generated wait-time reports. Public and low-privilege routes must not expose cross-tenant billing links, private subscription state, raw identifiers that weaken other boundaries, or low-volume aggregates that can reveal individual behaviour.

### Denial of Service

Public or lightly protected endpoints can directly consume money or compute, especially OpenAI chat/transcription and analytics-heavy routes. Rate limiting and quota enforcement must use trustworthy client identity signals, include sane size/time limits, and avoid easy bypass via spoofable headers.

### Elevation of Privilege

The biggest project-specific risk is broken access control across tenant and billing boundaries: authenticated users or anonymous callers must not be able to operate on another organisation’s Stripe customer, subscription, verification status, or analytics by submitting its identifier. All privileged actions must be derived from server-side ownership checks, not request bodies alone.
