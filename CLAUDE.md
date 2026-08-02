# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Drug Safety Signal Explorer — a public pharmacovigilance dashboard built on openFDA/FAERS
adverse-event data. `PLAN.md` is the authoritative spec: full stack, architecture, data model,
and a 13-phase build plan. Read it before doing substantive work.

## Working process (non-negotiable — from PLAN.md)

This project is built **one phase at a time**, driven by `PHASE_TO_EXECUTE` at the top of `PLAN.md`.

- Execute **only** the phase named in `PHASE_TO_EXECUTE`. Never start the next phase automatically.
- **Never commit and never push.** At the end of a phase, stop and hand the user (Marko) exact git
  commands to commit or roll back; let him run them.
- Before changing files, run `git status`. If the working tree is dirty, **stop** and report what is
  uncommitted rather than building on top of it.
- Work on the phase's dedicated branch (e.g. `phase-04-openfda-client`).
- Marko is a beginner. For each phase, explain in plain terms what it does and give a step-by-step
  **"Marko, you need to do this manually"** checklist for any external setup (Atlas cluster, API keys,
  env vars, dashboards). Never ask him to paste secrets into chat — tell him which file/key instead.
- After implementing, run the required checks (`pnpm build`, `pnpm lint`) and, per PLAN.md rule 18,
  spawn a subagent to functionally test the affected surface. Then wait for Marko's visual/UX approval.

## Domain wording constraints (must enforce everywhere — UI, AI prompts, copy)

FAERS is spontaneous-report data and does **not** prove causality or measure real-world frequency.

- Use: "reported FAERS reactions", "reported adverse events", "report counts", "signal exploration".
- Never use: "this drug causes", "side effects", "risk percentage", "incidence", "how common in real life".
- Include the standard limitation notice on relevant pages (see `LimitationsAlert`):
  "FAERS reports are spontaneous adverse event reports. They do not prove that a drug caused an event
  and cannot be used to estimate real-world incidence or personal risk."

## Commands

Package manager is **pnpm** (pinned `pnpm@11.5.2`); invoke via `corepack pnpm ...` if pnpm isn't global.

```bash
corepack pnpm dev              # Next dev server (localhost:3000)
corepack pnpm build            # production build — the primary acceptance check each phase
corepack pnpm lint             # ESLint (eslint-config-next, flat config)
corepack pnpm db:create-indexes  # idempotent MongoDB index setup (tsx script)
```

There is no test runner configured yet. "Tests" in PLAN.md means `pnpm build` + `pnpm lint` +
phase-specific script checks (e.g. planned `scripts/test-openfda.ts`).

## Architecture

**Stack:** Next.js 16 App Router · TypeScript (strict) · Tailwind v4 · shadcn/ui (new-york, neutral
base, `@/` alias) · MongoDB Atlas via official `mongodb` driver · Clerk auth · Mistral (AI summaries)
· Recharts · Render (deploy target).

**Cache-first, aggregate-only data model.** Raw FAERS reports are never stored. For a searched drug,
the app builds and caches an aggregated *snapshot* (counts, top reactions, seriousness breakdown,
yearly trend, label summary, source metadata, 30-day TTL). AI summaries are cached by
`subjectType + subjectKey + snapshotHash + promptVersion + model` so Mistral is never called twice for
the same input.

**Six MongoDB collections** (names centralized in `src/lib/db/collections.ts`):
`drug_snapshots`, `comparison_snapshots`, `ai_summaries`, `saved_reports`, `api_logs`, `search_logs`.
Indexes are created by `scripts/create-indexes.ts` (unique slug/comparisonKey/AI-cache keys, TTL on
`expiresAt`, log timestamps). The TTL helper is defensive — it reconciles a pre-existing wrongly-keyed
index rather than silently accepting it.

**Server-only boundary.** Anything touching secrets or MongoDB starts with `import "server-only"`
(`src/lib/db/*`, `src/lib/auth/config.ts`). `OPENFDA_API_KEY`, `MISTRAL_API_KEY`, `MONGODB_URI`, and
`CLERK_SECRET_KEY` must never reach client code. External APIs are wrapped in server-side clients under
`src/lib/<service>/` (openFDA client/queries/parsers land in Phase 04).

**MongoDB connection** (`src/lib/db/mongodb.ts`) is a cached singleton on `globalThis` (survives HMR),
with connection-failure cleanup so a failed connect doesn't poison the cached promise.

**Auth is Clerk, kept independent from the app's MongoDB.** Middleware lives in `src/proxy.ts` (Next 16
renamed `middleware.ts` → `proxy.ts`) and matches auth/dashboard/admin/api routes. `ClerkProvider`
wraps the app in `src/app/layout.tsx` with `/login` and `/register` as sign-in/up URLs and `/` as the
fallback redirect. Login/register/account use Clerk catch-all optional routes
(`[[...login]]`, etc.). Admin access is gated by `ADMIN_EMAILS` via `isAdminEmail()` in
`src/lib/auth/config.ts` — checked server-side in the page, not just middleware.

**Routes:** public pages under `src/app` (`/`, `/drug/[slug]`, `/compare`, `/methodology`,
`/dashboard/saved-reports`, `/admin`). Pages for not-yet-built phases render polished `PlaceholderPage`
components, not stubs. Shared chrome: `SiteHeader` / `SiteFooter` in the layout.

## Conventions

- Keep components small and typed. Fonts: DM Sans (`--font-dm-sans`) + Newsreader display
  (`--font-newsreader`).
- Design uses CSS custom properties (`--ink`, `--muted`, `--signal-dark`, etc.) defined in
  `globals.css`; reference reference mockups in `DIZAJN/`.
- Env: copy `.env.example` → `.env.local`. `.env` files are gitignored except `.env.example`.
