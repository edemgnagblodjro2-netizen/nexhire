# Overview

This project is a pnpm workspace monorepo using TypeScript, designed to provide a comprehensive aid-finding service for vulnerable individuals in Quebec. The primary application, "AttenteZéro," is an Expo mobile app (React Native) focused on connecting users with community and social services across four key cities in Quebec. The project aims to become a 100% free citizen service, complemented by a B2G (Business-to-Government) infrastructure offering institutional contracts and anonymized aggregated dashboards to municipalities and governmental organizations.

The core vision is to leverage mobile UX, conversational AI, geolocation, and multilingual support to offer a superior experience compared to existing directories. The strategic pivot focuses on avoiding sensitive beneficiary data storage to streamline compliance and target public administrations as primary paying customers, recognizing their solvency over individual professionals.

Key capabilities include an AI-powered chat for assistance (GPT-4o-mini), a comprehensive service directory with search and filtering, emergency SOS features, interactive maps, and user authentication. The project includes an administrative panel for managing services and an API server to support all functionalities.

# User Preferences

I want iterative development.
Ask before making major changes.

# System Architecture

## Monorepo Structure
The project is organized as a pnpm workspace monorepo, with each package managing its own dependencies. The stack utilizes Node.js 24, pnpm, and TypeScript 5.9.

## Mobile Application (AttenteZéro)
- **Technology**: Expo mobile app (React Native).
- **UI/UX**: Features an animated splash screen, gradient hero sections, and a complete dark mode.
- **Key Features**:
    - **Authentication**: Email/password login, registration, and reset-password functionality (awaiting external email service integration for full reset functionality).
    - **AI Chat**: GPT-4o-mini via SSE streaming, includes critical situation detection, humanized alerts, and supports 5 languages (FR/EN/ES/AR/HT). Offers a free quota (5 messages/day) with an unlimited premium option.
    - **Subscription Management**: Secure endpoint for Stripe user portal integration for premium features.
    - **Service Directory**: Displays 457 services with search, category filtering, and detailed views (description, location, hours). Services are loaded from API with AsyncStorage cache (6h TTL).
    - **Emergency Services**: SOS feature with 5 sections (911, hospital, ambulance, police, fire department), sorted by real-time GPS distance.
    - **Mapping**: Native iOS/Android map with filterable pins and an elegant web fallback.
    - **User Profile**: Editable name, email, address, password change, and language toggle.
    - **Multilingual Support**: FR/EN with AsyncStorage persistence.
- **Strategic Pivot (v1.0.33)**: Removed B2B "Field Mode" features (client files, appointments, team management) to reposition as a B2G infrastructure. The app now focuses on free citizen services (service search, map, SOS, AI Chat) and a one-time premium purchase for unlimited AI chat, favorites, and alerts. Archived B2B modules remain in the codebase but are deactivated.
- **B2G Insights Dashboard (Phase 2, v1.0.33)**: New `/b2g` page in the admin panel showing anonymized regional analytics for municipalities and CIUSSS — KPIs, top categories, daily activity, top services, coverage gap detection, CSV export. Backed by `GET /api/b2g/regions` and `GET /api/b2g/insights?city=&days=` (gated by `x-admin-key`). Privacy floor `MIN_AGGREGATE=5` clamps every aggregate (totals, daily series, top lists) below 5 events to zero. Visitor metric is split into `distinctAuthenticatedUsers` (count distinct user_id NOT NULL) and `anonymousEvents` (rows with NULL user_id) — never inflated estimates. Composite index `service_views(service_id, created_at)` and `services(city, active)` added for query performance. The endpoint also returns a global `userStats` block (total accounts, new in period, premium count, conversion %, citizens vs organisations) plus a `dailySignups` series rendered as an "Adoption — comptes utilisateurs" section in the dashboard.

## Admin Panel
- **Technology**: React + Vite web app.
- **Authentication**: Admin key-based login.
- **Features**: Dashboard with total stats, city/category lists, bar graphs. Service management including paginated lists, search, filters, add/edit modals, active/inactive toggles, and deletion. B2G regional insights dashboard at `/b2g` for partner municipalities/CIUSSS.

## API Server
- **Technology**: Express 5 API.
- **Database**: PostgreSQL + Drizzle ORM.
- **Validation**: Zod (`zod/v4`), `drizzle-zod`.
- **Build**: esbuild (CJS bundle).
- **Core Routes**:
    - Health check (`/api/healthz`).
    - AI chat (`POST /api/ai/chat`) with SSE streaming.
    - Mobile authentication (`/api/mobile-auth/*`).
    - Public service listing (`GET /api/services`).
    - Admin service management (`/api/admin/services/*`).
    - AI Voice transcription (`POST /api/ai/transcribe`) using Whisper-1, secured with authentication and rate-limiting.
    - Archived B2B routes (`/api/clients`, `/api/appointments`, `/api/team`) are present but not actively used in the current app version.

# External Dependencies

- **OpenAI**: Used for AI chat features (GPT-4o-mini) and voice transcription (Whisper-1).
- **Stripe**: Integrated for subscription management and billing portal access for premium features.
- **PostgreSQL**: Primary database for storing application data.
- **Drizzle ORM**: Used for database interaction with PostgreSQL.
- **Expo**: Framework for building the React Native mobile application.
- **Google Play Console / Apple App Store Connect**: Platforms for mobile application distribution.