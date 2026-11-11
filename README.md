# DataMind AI

## Project Introduction

DataMind AI is an AI-powered data analysis and data quality platform designed to help users upload datasets, understand their structure, discover data quality problems, analyze statistical patterns, receive AI-powered insights, and clean their data through a controlled and transparent workflow.

## Product Vision

To democratize data quality and analysis by providing an intuitive, AI-assisted platform that makes professional-grade data cleaning and analysis accessible to everyone—from data scientists to business analysts.

## Current Scope

**Available now (runs entirely in the browser):**

- CSV/TSV upload with validation (size, type) and automatic delimiter and encoding detection (UTF-8, Windows-1256, Windows-1252)
- Parsing with row-level warnings (line numbers), duplicate/empty header handling and a 100,000-row / 1,000-column limit
- Dataset profiling: type inference (integer, decimal, boolean, date, datetime, text), missing values, unique/duplicate counts, invalid values, quartiles, outliers, histograms and top values
- Data quality report with per-category scores and an overall score
- Data preview with search, type-aware sorting and pagination
- Persistence of the active dataset in IndexedDB (metadata and rows in separate stores)
- Cloudflare Worker with Static Assets and a `/api/health` endpoint (its `phase` field is a legacy build marker and is kept for compatibility)

**Planned (not implemented yet):**

- AI insights
- Data cleaning operations
- User authentication

## Technology Stack

### Frontend
- **React 19** - Latest React with concurrent features
- **TypeScript** - Strict mode enabled
- **Vite** - Fast build tool and dev server
- **Tailwind CSS v4** - Utility-first styling
- **React Router v7** - Client-side routing
- **Lucide React** - Consistent iconography

### Backend / Infrastructure
- **Cloudflare Workers** - Edge compute platform
- **Cloudflare Static Assets** - Asset serving with SPA fallback
- **Wrangler** - CLI for Cloudflare development
- **@cloudflare/vite-plugin** - Official Vite integration

### Testing
- **Vitest** - Fast unit testing
- **React Testing Library** - Component testing
- **jsdom** - DOM simulation for frontend tests
- Worker tests call the `fetch` handler directly in a Node environment (the Workers runtime pool is not used)

### Development Standards
- TypeScript strict mode
- ESLint with React hooks and refresh plugins
- Modular architecture with clear separation of concerns
- Reusable components with consistent APIs
- Accessibility fundamentals (ARIA, semantic HTML)
- Responsive design (mobile-first)

## Getting Started

Requires Node.js 20 or newer.

```bash
npm ci
cp .dev.vars.example .dev.vars   # local-only overrides (ENVIRONMENT=development)
npm run dev                      # Vite dev server with the Worker (http://localhost:3000)
```

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with the Cloudflare plugin |
| `npm run typecheck` | `tsc -b` across the app, worker and config projects |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm test` | Vitest (frontend in jsdom, Worker in Node) |
| `npm run test:coverage` | Vitest with V8 coverage |
| `npm run build` | Type-check, then production build into `dist/` |
| `npm run deploy` | Build, then `wrangler deploy` |

### TypeScript projects

`tsconfig.json` only references three projects so each environment gets the right types:

- `tsconfig.app.json` — `src/` and the frontend tests (DOM types)
- `tsconfig.worker.json` — `worker/` and the Worker tests (Workers types, no DOM)
- `tsconfig.node.json` — Vite/Vitest config files (Node types)

Path aliases live in `vite.aliases.ts` (Vite and Vitest) and `paths` in `tsconfig.app.json`; keep them in sync.

### Environments

`wrangler.jsonc` ships `ENVIRONMENT=production`. Locally, `.dev.vars` (git-ignored) overrides it with `development`.
All `/api` and `/api/*` requests run the Worker first, so API routes never fall back to the SPA.
