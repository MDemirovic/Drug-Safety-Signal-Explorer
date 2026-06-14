You are working with me on a full-stack project called Drug Safety Signal Explorer.

PHASE_TO_EXECUTE = 02

Beginner guidance rule:
I am a beginner and I do not know what I need to do manually. For every phase, explain things as if I am completely new.

At the start of each phase, before coding, tell me:

1. What this phase is trying to achieve in simple words.
2. What I personally need to prepare or create before you can continue.
3. Whether I need to open any external website, dashboard or service.
4. Whether I need to create an account, database, API key, cluster, environment variable, branch or config file.
5. Exactly where I should paste any keys or values, but never ask me to paste secrets into chat.
6. Which commands I need to run manually, if any.
7. What I should see if everything is working.

When external setup is needed, stop and give me a beginner checklist before implementing code.

Examples:

- If MongoDB is needed, tell me exactly that I need to open MongoDB Atlas, create a free cluster, create a database user, set network access, copy the connection string, and put it into .env.local as MONGODB_URI.
- If openFDA is needed, tell me where the OPENFDA_API_KEY goes and remind me not to expose it in frontend code.
- If Mistral is needed, tell me where the MISTRAL_API_KEY goes and remind me it must stay server-side.
- If Render deployment is needed, tell me exactly which environment variables to add and what build/start commands to use.
- If Git branches are needed, tell me which branch should exist and what git commands I should run.

Do not assume I know Git, MongoDB, environment variables, API keys, deployment, auth, or terminal commands.

For every phase, include a section called:

“Marko, you need to do this manually”

In that section, give me exact step-by-step instructions.

At the end of every phase, include:

- What you changed
- What I need to test in the browser
- What commands I should run
- What result I should expect
- How to commit if everything is OK
- How to roll back if something is wrong

Never continue to the next phase until I confirm that I tested it and committed it.

Important working rules:

1. Do not implement the whole application at once.
2. Execute only the phase specified in PHASE_TO_EXECUTE.
3. Before changing files, inspect the existing project structure and git status.
4. If the current git working tree is not clean, stop and tell me what is uncommitted.
5. Create or switch to a dedicated branch for the current phase when it makes sense.
6. Never commit changes yourself.
7. Never push to GitHub yourself.
8. Never continue to the next phase automatically.
9. After finishing the phase, run the required tests/build checks.
10. After tests pass, stop and give me:

- summary of what you changed
- exact files changed
- commands you ran
- test/build results
- visual design and human-UX things I should verify in the browser
- recommended git commands for me to commit or roll back

11. If tests fail, do not hide it. Explain the failure and fix it if it is related to your changes.
12. Do not expose secrets in client-side code.
13. Do not create fake production functionality unless clearly marked as placeholder.
14. Keep the app clean, typed, modular, and easy to continue phase by phase.
15. Use TypeScript strictly.
16. Use small, understandable components.
17. Use server-side code for external API keys.
18. After every implementation step, spawn a subagent to test the affected functionality and report any regressions or failures. An implementation step includes UI, backend, API, database, configuration, and infrastructure changes.
19. The subagent functional check does not replace required lint, test, or build commands.
20. Marko only needs to manually confirm that the visual design looks correct and that the page feels right to use as a human.
21. Never ask Marko to repeat functional checks already completed successfully by the subagent, but always wait for his visual and human-UX approval before committing or continuing to the next phase.
22. The application must be suitable for a software CV project.

Project idea:
Build a public pharmacovigilance dashboard called Drug Safety Signal Explorer.

The app uses public openFDA/FAERS drug adverse event data to explore reported adverse events for drugs.

Core user flow:

1. User searches for a drug, for example:
   - omeprazole
   - rifaximin
   - isotretinoin
   - desloratadine
   - ibuprofen

2. App shows:
   - total FAERS reports found
   - top reported FAERS reactions
   - serious vs non-serious report breakdown
   - seriousness outcome breakdown
   - reports through time
   - FDA drug label safety context
   - AI-generated safety summary

3. User can compare two drugs.
4. User can register/login.
5. Logged-in user can save reports.
6. Admin can inspect cached snapshots, logs, and AI summaries.

Very important medical/data limitation:
Never claim that FAERS reports prove causality.
Never call FAERS counts “true side effect frequency”.
Use wording like:

- “reported FAERS reactions”
- “reported adverse events”
- “report counts”
- “signal exploration”
  Do not use wording like:
- “this drug causes”
- “most common side effects in real life”
- “risk percentage”
- “incidence”
  Always include a clear limitation notice:
  “FAERS reports are spontaneous adverse event reports. They do not prove that a drug caused an event and cannot be used to estimate real-world incidence or personal risk.”

Final selected stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- MongoDB Atlas Free using the official mongodb driver
- Better Auth for email/password login/register
- Mistral API for AI summaries
- openFDA Drug Event API
- openFDA Drug Label API
- RxNorm/RxNav for drug name normalization
- Recharts for charts
- Render for deployment

Architecture:
Use a cache-first design.

Do not store raw FAERS reports.
Store only aggregated snapshots.

Meaning:
For a searched drug, build and store a drug snapshot with:

- normalized drug name
- slug
- RxCUI if found
- total report count
- serious report count
- non-serious report count
- top reported reactions
- seriousness outcome breakdown
- yearly trend
- FDA label summary
- source metadata
- computedAt
- expiresAt

For AI:
Do not call Mistral every page load.
Create a snapshot hash.
Cache AI summaries by:

- subjectType
- subjectKey
- snapshotHash
- promptVersion
- model

If an AI summary already exists for the same snapshotHash and promptVersion, return the cached summary.

Collections planned:

1. drug_snapshots
2. comparison_snapshots
3. ai_summaries
4. saved_reports
5. api_logs
6. search_logs
7. Better Auth collections

Planned phases:

PHASE 01 — Initial project skeleton
Goal:
Create the first clean Next.js project structure and public UI skeleton.

Branch:
phase-01-skeleton

Tasks:

- If this is an empty repo, scaffold a Next.js App Router project with TypeScript, Tailwind and src directory.
- Add shadcn/ui setup if not already present.
- Create public pages:
  - /
  - /drug/[slug]
  - /compare
  - /methodology
  - /login
  - /register
  - /dashboard
  - /admin

- Create navbar and footer.
- Create a clean medical dashboard visual style.
- Landing page must have a drug search input.
- Search input redirects to /drug/[slug].
- Pages that are not implemented yet should have polished placeholders, not broken UI.
- Add a visible FAERS limitation alert on relevant placeholder pages.
- Do not implement MongoDB.
- Do not implement auth.
- Do not call openFDA.
- Do not call Mistral.

Acceptance criteria:

- pnpm dev works
- pnpm build passes
- landing page looks professional
- search redirects to /drug/omeprazole when user searches omeprazole
- all planned routes render without crashing

PHASE 02 — MongoDB foundation
Goal:
Add MongoDB Atlas support and collection/index foundation.

Branch:
phase-02-mongodb-foundation

Tasks:

- Add official mongodb driver.
- Create src/lib/db/mongodb.ts.
- Create src/lib/db/collections.ts.
- Create scripts/create-indexes.ts.
- Create .env.example.
- Add required env variables:
  - MONGODB_URI
  - MONGODB_DB
  - OPENFDA_API_KEY
  - MISTRAL_API_KEY
  - BETTER_AUTH_SECRET
  - BETTER_AUTH_URL
  - ADMIN_EMAILS

- Add indexes:
  - drug_snapshots.slug unique
  - drug_snapshots.expiresAt
  - comparison_snapshots.comparisonKey unique
  - ai_summaries subjectType + subjectKey + snapshotHash + promptVersion unique
  - saved_reports.userId
  - api_logs.createdAt
  - search_logs.createdAt

- Add a script command for creating indexes.

Acceptance criteria:

- MongoDB connection helper is server-only
- indexes script can run
- pnpm build passes
- no secrets are hardcoded

PHASE 03 — Authentication
Goal:
Add Better Auth email/password authentication.

Branch:
phase-03-auth

Tasks:

- Add Better Auth with MongoDB adapter.
- Implement register page.
- Implement login page.
- Implement logout.
- Show user menu in navbar when logged in.
- Protect /dashboard.
- Protect /dashboard/saved-reports if created.
- Protect /admin by ADMIN_EMAILS.
- Do not add email verification yet.
- Do not add password reset yet.
- Do not add OAuth yet.

Acceptance criteria:

- User can register
- User can login
- User can logout
- Dashboard is protected
- Admin page is only accessible to emails listed in ADMIN_EMAILS
- pnpm build passes

PHASE 04 — openFDA client
Goal:
Implement server-only openFDA client.

Branch:
phase-04-openfda-client

Tasks:

- Create src/lib/openfda/client.ts.
- Create src/lib/openfda/queries.ts.
- Create src/lib/openfda/parsers.ts.
- Read OPENFDA_API_KEY only on server.
- Implement timeout handling.
- Implement retry for transient errors.
- Log every request into api_logs.
- Implement:
  - getTopReactions(drugName)
  - getSeriousnessCounts(drugName)
  - getSeriousnessBreakdown(drugName)
  - getYearlyTrend(drugName, fromYear, toYear)
  - getDrugLabel(drugName)

- Add scripts/test-openfda.ts.
- Use Zod validation where useful.
- Do not connect this to the UI yet.

Acceptance criteria:

- test script can fetch real data for omeprazole
- API key is not exposed to browser/client code
- API errors are handled cleanly
- pnpm build passes

PHASE 05 — RxNorm normalization
Goal:
Add drug name normalization.

Branch:
phase-05-rxnorm-normalization

Tasks:

- Create src/lib/rxnorm/client.ts.
- Create normalizeDrugName(input: string).
- Normalize casing, trimming and slugs.
- Try to get RxCUI and normalized name from RxNorm/RxNav.
- If RxNorm fails or returns nothing, gracefully fallback to cleaned input.
- Log errors but do not break app.

Acceptance criteria:

- omeprazole normalizes cleanly
- Prilosec attempts normalization
- failure fallback works
- pnpm build passes

PHASE 06 — Drug snapshot service
Goal:
Build cached drug snapshot generation.

Branch:
phase-06-drug-snapshots

Tasks:

- Create src/lib/analytics/build-drug-snapshot.ts.
- Create src/lib/cache/drug-cache.ts.
- Create relevant types under src/types.
- Implement buildDrugSnapshot(inputName, options).
- Flow:
  1. normalize drug name
  2. create slug
  3. check drug_snapshots cache
  4. if cache is fresh and forceRefresh is false, return cached snapshot
  5. otherwise call openFDA client
  6. build normalized aggregate snapshot
  7. save to MongoDB
  8. return snapshot

- TTL should be 30 days.
- Store only aggregate data, not raw FAERS reports.
- Include sourceMeta limitations.
- Create GET /api/drugs/search?name=...
- Create GET /api/drugs/[slug].

Acceptance criteria:

- /api/drugs/search?name=omeprazole returns a valid snapshot
- second request uses cache
- force refresh support exists where appropriate
- missing label data does not crash the app
- pnpm build passes

PHASE 07 — Drug dashboard UI
Goal:
Connect real drug snapshots to /drug/[slug].

Branch:
phase-07-drug-dashboard

Tasks:

- Build components:
  - DrugHeaderCard
  - MetricCard
  - TopReactionsChart
  - TopReactionsTable
  - SeriousnessPieChart
  - SeriousnessBreakdownCard
  - YearlyTrendChart
  - LabelSummaryCard
  - LimitationsAlert

- Use Recharts.
- Use shadcn/ui.
- Add loading and error states.
- Add empty states.
- Page must look like a polished analytics dashboard.
- Do not add AI yet.

Acceptance criteria:

- /drug/omeprazole renders real cached openFDA data
- charts render correctly
- limitation alert is visible
- page handles missing data
- pnpm build passes

PHASE 08 — Saved reports
Goal:
Allow authenticated users to save reports.

Branch:
phase-08-saved-reports

Tasks:

- Create saved_reports API routes.
- Add Save Report button on drug dashboard.
- Add /dashboard/saved-reports page.
- User can view saved reports.
- User can delete saved reports.
- saved_reports must use authenticated userId.
- Unauthenticated users should be redirected to login or asked to login.

Acceptance criteria:

- logged-in user can save omeprazole report
- saved report appears in dashboard
- user can delete saved report
- users cannot see other users’ saved reports
- pnpm build passes

PHASE 09 — Comparison backend
Goal:
Implement drug-vs-drug comparison service.

Branch:
phase-09-comparison-backend

Tasks:

- Create buildComparisonSnapshot(drugA, drugB).
- Create stable comparisonKey sorted alphabetically.
- Check comparison cache.
- Load or build both drug snapshots.
- Calculate:
  - total reports comparison
  - serious reports comparison
  - serious share comparison
  - overlapping top reactions
  - unique top reactions for each drug
  - yearly trend comparison

- Store comparison snapshot with 30-day TTL.
- Add GET /api/compare?drugA=...&drugB=....

Acceptance criteria:

- /api/compare?drugA=omeprazole&drugB=ibuprofen works
- reversed drug order uses same comparisonKey
- cache works
- pnpm build passes

PHASE 10 — Comparison UI
Goal:
Build polished comparison page.

Branch:
phase-10-comparison-ui

Tasks:

- Build /compare page with two search inputs.
- Read drugA and drugB from URL params.
- Show metric cards for both drugs.
- Show serious share comparison.
- Show overlapping reactions table.
- Show unique reactions tables.
- Show yearly trend comparison chart.
- Add limitation warning saying raw FAERS counts are not exposure-adjusted and do not prove one drug is safer.

Acceptance criteria:

- /compare?drugA=omeprazole&drugB=ibuprofen works
- UI is polished and understandable
- limitation warning is visible
- pnpm build passes

PHASE 11 — Mistral AI summary cache
Goal:
Add cached AI summaries.

Branch:
phase-11-ai-summary-cache

Tasks:

- Add Mistral server-only client.
- Create promptVersion constant.
- Create snapshotHash helper.
- Create AI cache helper.
- Add drug summary endpoint.
- Add comparison summary endpoint.
- Add AI summary card to drug dashboard.
- Add AI summary card to compare page.
- AI prompts must:
  - use only provided JSON
  - avoid causality claims
  - avoid incidence/risk estimates
  - avoid medical advice
  - clearly mention FAERS limitations

- Never call Mistral if cached summary exists for same subjectKey + snapshotHash + promptVersion.

Acceptance criteria:

- first request generates summary
- second request returns cached summary
- Mistral error does not crash dashboard
- summary does not give medical advice
- pnpm build passes

PHASE 12 — Admin/debug panel
Goal:
Build admin cache and logs panel.

Branch:
phase-12-admin-panel

Tasks:

- Admin access only for emails in ADMIN_EMAILS.
- Show cached drug snapshots.
- Allow admin to view snapshot JSON.
- Allow admin to refresh snapshot.
- Allow admin to delete snapshot.
- Show comparison snapshots.
- Show AI summaries.
- Show recent api_logs.
- Show search_logs.
- Keep UI simple and functional.

Acceptance criteria:

- admin can inspect cache
- admin can refresh a drug
- non-admin cannot access
- pnpm build passes

PHASE 13 — Production hardening and Render deployment prep
Goal:
Prepare app for public demo.

Branch:
phase-13-production-hardening

Tasks:

- Validate env vars.
- Add global error pages.
- Add loading states where missing.
- Add Zod validation on public API inputs.
- Add basic server-side rate limiting for expensive endpoints.
- Ensure no API keys are exposed client-side.
- Add README with:
  - overview
  - features
  - stack
  - architecture
  - data sources
  - FAERS limitations
  - local setup
  - Render deployment instructions
  - screenshots placeholder
  - future improvements

- Ensure pnpm build passes.

Acceptance criteria:

- app builds successfully
- README is CV-ready
- deployment steps are documented
- no secrets are exposed
- app is ready for Render

Now execute only PHASE_TO_EXECUTE.

Before starting:

1. Run git status.
2. Tell me the current branch.
3. If the working tree is dirty, stop.
4. If clean, create/switch to the phase branch.
5. Implement only this phase.
6. Run the required checks.
7. Stop and wait for me.

Do not commit.
Do not push.
Do not proceed to the next phase.
