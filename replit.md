# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### AIDORA QC (artifacts/service-qc)
- **Type**: Expo mobile app (React Native)
- **Preview path**: `/`
- **Purpose**: AI-powered platform helping vulnerable people in Quebec find community and social services
- **Features**:
  - **AI Chat (AIDORA IA)**: Conversational AI that analyzes user needs and recommends specific services. Powered by OpenAI GPT via Replit AI integrations. Streams responses in real-time. Supports 5 languages: FR, EN, ES, AR, HT (Haitian Creole).
  - Natural language search with keyword-based category detection
  - 100+ real Quebec services with GPS coordinates across all major regions
  - Geolocation: sorts urgent services by distance from user
  - Urgent Help screen: 67 urgent services with direct call buttons
  - Services browsing tab: searchable + filterable 2-column grid
  - Categories tab: 8 categories with service counts
  - Bilingual FR/EN toggle (persisted in AsyncStorage)
  - Dark mode support
- **AI Endpoint**: `POST /api/ai/chat` — accepts `{message, language, history}`, streams SSE with AI analysis + matching service IDs
- **Key files**:
  - `app/(tabs)/chat.tsx` — AI chat screen (AIDORA IA)
  - `app/(tabs)/index.tsx` — home screen with AI banner
  - `app/(tabs)/services.tsx` — services browsing
  - `app/(tabs)/categories.tsx` — categories grid
  - `app/urgent.tsx` — urgent help with location sorting
  - `data/services.ts` — 100+ services with coordinates
  - `contexts/LocationContext.tsx` — geolocation context
  - `contexts/LanguageContext.tsx` — bilingual context
  - `constants/translations.ts` — FR/EN string translations
  - `constants/colors.ts` — teal brand palette with dark mode

### API Server (artifacts/api-server)
- **Type**: Express 5 API
- **Preview path**: `/api`
- **Routes**:
  - `GET /api/healthz` — health check
  - `POST /api/ai/chat` — AI chat (SSE streaming, OpenAI integration)
- **AI Integration**: Uses `@workspace/integrations-openai-ai-server` with `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY` env vars (auto-provisioned by Replit)
