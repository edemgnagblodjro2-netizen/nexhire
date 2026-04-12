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

### ServiceQC — Community Services Quebec (artifacts/service-qc)
- **Type**: Expo mobile app
- **Preview path**: `/`
- **Purpose**: Helps users quickly find community and social services in Quebec
- **Features**:
  - Natural language search with intelligent category detection
  - 8 service categories: Housing, Food, Mental Health, Health, Immigration, Employment, Family, Social Support
  - 35+ Quebec community services with phone numbers, websites, and descriptions
  - Urgent Help button with emergency services
  - Category browsing chips + quick prompt examples
  - Service detail screen with direct call and website links
- **Key files**:
  - `data/services.ts` — all service data (35+ services)
  - `utils/detectCategory.ts` — keyword detection logic for natural language input
  - `utils/categoryColors.ts` — category colors and icons
  - `app/(tabs)/index.tsx` — home screen
  - `app/results.tsx` — search results screen
  - `app/urgent.tsx` — urgent help screen
  - `app/service/[id].tsx` — service detail screen
  - `constants/colors.ts` — teal/green brand palette with dark mode support
