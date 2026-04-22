# Bimì - Personal Life Assistant App

## Overview

Bimì is an Italian-language personal life assistant mobile-first web application. It helps users organize their daily life including meal planning, pantry/grocery management, reminders, and health tracking (menstrual cycle, defecation logs). The app features an AI chatbot assistant ("Bimì") powered by OpenAI that can suggest recipes based on pantry ingredients, add shopping list items, and create reminders through natural conversation. It also supports voice input/output via audio integrations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router) with Italian path names (`/pasti`, `/dispensa`, `/promemoria`)
- **State Management**: TanStack React Query for server state; local React state for UI
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming; warm organic color palette (green, mustard, orange, chocolate); dark mode support via class-based toggling
- **Fonts**: "Outfit" for display/headers, "DM Sans" for body text
- **Charts**: Recharts for macro nutrient pie charts
- **Animations**: Framer Motion for transitions and interactions
- **Layout**: Mobile-first, max-width `max-w-lg` centered layout with fixed bottom navigation bar and floating AI chat button

### Backend
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript, executed via `tsx` in development
- **API Pattern**: RESTful JSON API under `/api/*` prefix. Route definitions with Zod schemas are shared between client and server in `shared/routes.ts`
- **AI Integration**: Google Gemini via `@google/generative-ai` SDK (`GEMINI_API_KEY`). Helper module at `server/gemini.ts` exposes `generateText`, `generateJson`, `generateWithTools` (function calling), `streamText`, and `transcribeAudio`. Used for chat with tools (add shopping items, reminders), recipe generation, and speech-to-text. Text-to-speech is handled client-side via the browser Web Speech API
- **Build**: Custom build script (`script/build.ts`) using Vite for client and esbuild for server, outputting to `dist/`

### Data Storage
- **Database**: PostgreSQL via `DATABASE_URL` environment variable
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation integration
- **Schema Location**: `shared/schema.ts` (main tables) and `shared/models/chat.ts` (conversation/message tables)
- **Tables**:
  - `users` - Basic user accounts (MVP: single default user, userId=1)
  - `daily_logs` - Daily health tracking (menstrual phase, flow, intercourse, defecation, notes) keyed by date
  - `meals` - Meal entries with nutritional data, recipe info, and meal type
  - `pantry_items` - Inventory items categorized as dispensa/frigo/freezer with expiration dates
  - `shopping_list_items` - Grocery list with checked state
  - `reminders` - Time-based reminders with completion status
  - `conversations` / `messages` - Chat history for AI conversations
- **Migrations**: Managed via `drizzle-kit push` (`npm run db:push`)

### Storage Layer
- `server/storage.ts` defines an `IStorage` interface and `DatabaseStorage` implementation using Drizzle queries
- All database access goes through the exported `storage` singleton

### Replit Integrations
Located in `server/replit_integrations/`:
- **chat/**: Generic conversation CRUD routes and storage for persistent chat history
- **audio/**: Voice recording, speech-to-text (Whisper), text-to-speech, and voice chat streaming. Includes ffmpeg-based audio format conversion. Client-side uses AudioWorklet for PCM16 playback
- **image/**: Image generation via `gpt-image-1` model
- **batch/**: Batch processing utilities with rate limiting and retries for bulk AI operations

### Development vs Production
- **Development**: Vite dev server with HMR proxied through Express, using `tsx` for TypeScript execution
- **Production**: Client built to `dist/public/`, server bundled to `dist/index.cjs` via esbuild, served as static files with SPA fallback

## External Dependencies

- **PostgreSQL**: Primary database, must be provisioned with `DATABASE_URL` environment variable
- **OpenAI API** (via Replit AI Integrations): Powers the Bimì chatbot, recipe generation, voice features, and image generation. Requires `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables
- **ffmpeg**: Required on the server for audio format conversion (WebM/MP4/OGG to WAV) for speech-to-text processing
- **Google Fonts**: Loads DM Sans, Outfit, Fira Code, Geist Mono, and Architects Daughter fonts from CDN