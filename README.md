# Drug Safety Signal Explorer

A public pharmacovigilance dashboard for carefully exploring reported adverse
event signals from FAERS data.

## Current foundation

The project currently includes:

- TypeScript, Tailwind CSS, and `src` directory
- shadcn/ui-compatible project setup
- Shared navigation, footer, and FAERS limitation alert
- Working landing-page drug search route
- Polished placeholders for all planned public routes
- Server-only MongoDB helpers and idempotent index setup
- Better Auth email/password registration, login, logout, and route protection

No openFDA requests, saved-report functionality, or AI requests are implemented
yet.

## Local development

```bash
corepack pnpm install
corepack pnpm db:create-indexes
corepack pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Authentication also requires server-side `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, and `ADMIN_EMAILS` values. See `.env.example` for the
expected format.

## Important limitation

FAERS reports are spontaneous adverse event reports. They do not prove that a
drug caused an event and cannot be used to estimate real-world incidence or
personal risk.
