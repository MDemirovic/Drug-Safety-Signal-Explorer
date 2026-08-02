import assert from "node:assert/strict";

import { AI_PROMPT_VERSION, buildAiSummary, type AiSummaryDependencies } from "../src/lib/ai/build-ai-summary";
import { createMistralSummaryClient, MistralSummaryError, SAFE_AI_OBSERVATIONS, SAFE_AI_OVERVIEW, STANDARD_FAERS_LIMITATIONS } from "../src/lib/ai/mistral-client";
import { snapshotHash } from "../src/lib/ai/snapshot-hash";
import { AiSummaryRateLimitExceededError, enforceAiSummaryBuildLimit } from "../src/lib/security/rate-limit";
import type { AiSummaryContent, AiSummaryDocument } from "../src/types/ai-summary";

const safeSummary: AiSummaryContent = {
  overview: SAFE_AI_OVERVIEW,
  keyObservations: [SAFE_AI_OBSERVATIONS.report_volume, SAFE_AI_OBSERVATIONS.reaction_terms],
  limitations: STANDARD_FAERS_LIMITATIONS,
};
const safeSelection = { overview: "grounded_snapshot", keyObservations: ["report_volume", "reaction_terms"], limitations: "faers_standard" };
const drugInput = { drug: { normalizedName: "Omeprazole", totalReports: 100, seriousReports: 20 }, topReactions: [{ term: "NAUSEA", count: 20 }], seriousnessBreakdown: { hospitalization: 5 }, yearlyTrend: [], labelContext: null };

function harness(model = "test-model") {
  const cache = new Map<string, AiSummaryDocument>();
  let calls = 0;
  let authorizations = 0;
  let fail = false;
  const key = (item: Pick<AiSummaryDocument, "subjectType" | "subjectKey" | "snapshotHash" | "promptVersion" | "model">) =>
    [item.subjectType, item.subjectKey, item.snapshotHash, item.promptVersion, item.model].join(":");
  const dependencies: AiSummaryDependencies = {
    client: {
      model,
      async summarize() {
        calls += 1;
        if (fail) throw new MistralSummaryError("Synthetic outage.");
        await Promise.resolve();
        return safeSummary;
      },
    },
    async getCached(query) { return cache.get(key(query)) ?? null; },
    async save(summary) { cache.set(key(summary), summary); return true; },
    now: () => new Date("2026-08-01T12:00:00.000Z"),
  };
  return {
    dependencies,
    beforeGenerate: () => { authorizations += 1; },
    counts: () => ({ calls, authorizations }),
    documents: () => [...cache.values()],
    setFailure(value: boolean) { fail = value; },
  };
}

async function main() {
  assert.equal(
    snapshotHash({ b: 2, a: { value: 1 }, cacheStatus: "miss", expiresAt: "tomorrow" }),
    snapshotHash({ a: { value: 1 }, b: 2, cacheStatus: "hit", expiresAt: "later" }),
    "hashing must be stable and exclude delivery metadata",
  );
  assert.notEqual(snapshotHash({ reports: 1 }), snapshotHash({ reports: 2 }), "metric changes must invalidate the cache");

  const cached = harness();
  const options = {
    subjectType: "drug" as const,
    subjectKey: "omeprazole",
    snapshot: drugInput,
    dependencies: cached.dependencies,
    beforeGenerate: cached.beforeGenerate,
    expiresAt: new Date("2026-08-31T12:00:00.000Z"),
  };
  const first = await buildAiSummary(options);
  const second = await buildAiSummary(options);
  assert.equal(first.cacheStatus, "miss");
  assert.equal(second.cacheStatus, "hit");
  assert.deepEqual(cached.counts(), { calls: 1, authorizations: 1 }, "a matching cache hit must not call Mistral or consume build quota");
  assert.equal(first.promptVersion, AI_PROMPT_VERSION);
  assert.equal(cached.documents()[0].expiresAt.toISOString(), "2026-08-31T12:00:00.000Z", "summary expiry must follow its source snapshot");

  await buildAiSummary({ ...options, snapshot: { ...drugInput, drug: { ...drugInput.drug, totalReports: 101 } } });
  assert.deepEqual(cached.counts(), { calls: 2, authorizations: 2 }, "changed snapshot data must generate a new summary");

  const concurrent = harness();
  const concurrentOptions = { ...options, subjectKey: "ibuprofen", dependencies: concurrent.dependencies, beforeGenerate: concurrent.beforeGenerate };
  await Promise.all([buildAiSummary(concurrentOptions), buildAiSummary(concurrentOptions), buildAiSummary(concurrentOptions)]);
  assert.deepEqual(concurrent.counts(), { calls: 1, authorizations: 1 }, "concurrent cache misses must collapse to one generation");

  const recovering = harness();
  recovering.setFailure(true);
  await assert.rejects(buildAiSummary({ ...options, subjectKey: "failure", dependencies: recovering.dependencies }), MistralSummaryError);
  recovering.setFailure(false);
  const recovered = await buildAiSummary({ ...options, subjectKey: "failure", dependencies: recovering.dependencies });
  assert.equal(recovered.cacheStatus, "miss", "failed in-flight work must be cleared for retry");

  let requestBody: Record<string, unknown> | undefined;
  let authorization = "";
  const client = createMistralSummaryClient({
    apiKey: "server-secret",
    model: "test-mistral",
    fetcher: async (_input, init) => {
      authorization = new Headers(init?.headers).get("Authorization") ?? "";
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(safeSelection) } }] }), { status: 200 });
    },
  });
  const drugJson = JSON.stringify(drugInput);
  assert.deepEqual(await client.summarize(drugJson), safeSummary);
  assert.equal(authorization, "Bearer server-secret");
  assert.deepEqual(requestBody?.response_format, { type: "json_object" });
  assert.equal(JSON.stringify(requestBody).includes("server-secret"), false, "the API key must not enter the request body or prompt");
  const messages = requestBody?.messages as Array<{ role: string; content: string }>;
  assert.equal(messages[1].content, drugJson, "only supplied snapshot JSON belongs in the user prompt");
  assert.match(messages[0].content, /Never provide causality/);
  assert.match(messages[0].content, /medical advice/);
  assert.match(messages[0].content, /reporting bias/);

  const invalid = createMistralSummaryClient({
    apiKey: "server-secret",
    fetcher: async () => new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), { status: 200 }),
  });
  await assert.rejects(invalid.summarize("{}"), MistralSummaryError);

  async function rejectsUnsafe(summary: AiSummaryContent) {
    const unsafeClient = createMistralSummaryClient({
      apiKey: "server-secret",
      fetcher: async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(summary) } }] }), { status: 200 }),
    });
    await assert.rejects(unsafeClient.summarize("{}"), MistralSummaryError);
  }
  await rejectsUnsafe({ ...safeSummary, overview: "You should stop taking this medication." });
  await rejectsUnsafe({ ...safeSummary, overview: "The drug causes nausea." });
  await rejectsUnsafe({ ...safeSummary, overview: "Personal risk is increased by 20%." });
  await rejectsUnsafe({ ...safeSummary, overview: "This drug is safer and has lower risk." });
  await rejectsUnsafe({ ...safeSummary, overview: "Consider discontinuing this medication." });
  await rejectsUnsafe({ ...safeSummary, overview: "This medication definitely triggers nausea." });
  await rejectsUnsafe({ ...safeSummary, overview: "Twenty percent of patients experience nausea." });
  await rejectsUnsafe({ ...safeSummary, overview: "Drug A has a better safety profile than Drug B." });
  await rejectsUnsafe({ ...safeSummary, limitations: "These aggregates should be interpreted carefully." });

  async function rejectsUngrounded(selection: unknown, snapshot: unknown) {
    const selectionClient = createMistralSummaryClient({
      apiKey: "server-secret",
      fetcher: async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(selection) } }] }), { status: 200 }),
    });
    await assert.rejects(selectionClient.summarize(JSON.stringify(snapshot)), MistralSummaryError);
  }
  await rejectsUngrounded({ ...safeSelection, keyObservations: ["report_volume", "reaction_overlap"] }, drugInput);
  await rejectsUngrounded({ ...safeSelection, keyObservations: ["report_volume", "label_context"] }, { drugA: { totalReports: 2, seriousReports: 1 }, drugB: { totalReports: 2, seriousReports: 1 }, yearlyTrend: [] });
  await rejectsUngrounded(safeSelection, {});

  const unsafeCached: AiSummaryDependencies = {
    client: { model: "test-model", async summarize() { throw new Error("must not generate"); } },
    async getCached(query) { return { ...query, generationToken: 1, summary: { ...safeSummary, overview: "Consider discontinuing this medication." }, createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000) }; },
    async save() { throw new Error("must not save"); },
    now: () => new Date(),
  };
  await assert.rejects(buildAiSummary({ ...options, subjectKey: "unsafe-cache", dependencies: unsafeCached }), MistralSummaryError);

  const cacheWithId: AiSummaryDependencies = {
    client: { model: "test-model", async summarize() { throw new Error("must not generate"); } },
    async getCached(query) {
      return { ...query, generationToken: 1, summary: safeSummary, createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000), _id: "internal-id" } as AiSummaryDocument;
    },
    async save() { throw new Error("must not save"); },
    now: () => new Date(),
  };
  const cleanPayload = await buildAiSummary({ ...options, subjectKey: "cache-id", dependencies: cacheWithId });
  assert.equal("_id" in cleanPayload, false, "MongoDB persistence identifiers must not enter API payloads");

  let expiredCalls = 0;
  let stored: AiSummaryDocument | null = {
    subjectType: "drug",
    subjectKey: "expired-row",
    snapshotHash: snapshotHash(drugInput),
    promptVersion: AI_PROMPT_VERSION,
    model: "test-model",
    generationToken: 1,
    summary: safeSummary,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    expiresAt: new Date("2026-07-01T00:00:00.000Z"),
  };
  const replacement: AiSummaryDependencies = {
    client: { model: "test-model", async summarize() { expiredCalls += 1; return safeSummary; } },
    async getCached(query) {
      return stored && stored.expiresAt > new Date("2026-08-01T12:00:00.000Z")
        && stored.subjectKey === query.subjectKey ? stored : null;
    },
    async save(summary) { stored = summary; return true; },
    now: () => new Date("2026-08-01T12:00:00.000Z"),
  };
  const expiredOptions = { ...options, subjectKey: "expired-row", dependencies: replacement };
  assert.equal((await buildAiSummary(expiredOptions)).cacheStatus, "miss");
  assert.equal((await buildAiSummary(expiredOptions)).cacheStatus, "hit");
  assert.equal(expiredCalls, 1, "an expired unique-key row must be replaced so later requests hit cache");

  let sharedDocument: AiSummaryDocument | null = null;
  let leaseOwner: string | null = null;
  let leaseExpiresAt = 0;
  let leaseGeneration = 0;
  let distributedCalls = 0;
  function distributedDependencies(): AiSummaryDependencies {
    return {
      client: {
        model: "test-model",
        async summarize() {
          distributedCalls += 1;
          await new Promise((resolve) => setTimeout(resolve, 300));
          return safeSummary;
        },
      },
      async getCached(query) {
        return sharedDocument && sharedDocument.subjectKey === query.subjectKey ? sharedDocument : null;
      },
      async save(summary) { sharedDocument = summary; return true; },
      now: () => new Date(),
      async acquireLease(_key, owner, now, leaseUntil) {
        if (leaseOwner && leaseOwner !== owner && leaseExpiresAt > now.getTime()) return null;
        if (leaseOwner !== owner) leaseGeneration += 1;
        leaseOwner = owner;
        leaseExpiresAt = leaseUntil.getTime();
        return leaseGeneration;
      },
      async releaseLease(_key, owner) { if (leaseOwner === owner) leaseOwner = null; },
      async renewLease(_key, owner, leaseUntil) {
        if (leaseOwner !== owner) return false;
        leaseExpiresAt = leaseUntil.getTime();
        return true;
      },
      sleep: () => new Promise((resolve) => setTimeout(resolve, 1)),
      inFlight: new Map(),
      leaseMs: 100,
      leaseHeartbeatMs: 10,
      leasePollMs: 1,
      leasePollAttempts: 300,
    };
  }
  const distributedOptions = { ...options, subjectKey: "distributed", beforeGenerate: undefined };
  const firstInstance = buildAiSummary({ ...distributedOptions, dependencies: distributedDependencies() });
  await new Promise((resolve) => setTimeout(resolve, 150));
  const secondInstance = buildAiSummary({ ...distributedOptions, dependencies: distributedDependencies() });
  const distributedResults = await Promise.all([firstInstance, secondInstance]);
  assert.deepEqual(distributedResults.map((result) => result.cacheStatus).sort(), ["hit", "miss"]);
  assert.equal(distributedCalls, 1, "a shared lease must prevent duplicate Mistral calls across application instances");
  const leaseProbe = distributedDependencies();
  const probeNow = new Date();
  const tokenAfterRelease = await leaseProbe.acquireLease!("probe", "owner-two", probeNow, new Date(probeNow.getTime() + 100));
  await leaseProbe.releaseLease!("probe", "owner-two");
  const tokenAfterReacquire = await leaseProbe.acquireLease!("probe", "owner-three", probeNow, new Date(probeNow.getTime() + 100));
  assert.ok(tokenAfterRelease !== null && tokenAfterReacquire !== null && tokenAfterReacquire > tokenAfterRelease, "lease generations must remain monotonic across release and reacquisition");
  await leaseProbe.releaseLease!("probe", "owner-three");

  let lostLeaseCalls = 0;
  const lostLease: AiSummaryDependencies = {
    client: { model: "test-model", async summarize() { lostLeaseCalls += 1; return safeSummary; } },
    async getCached() { return null; },
    async save() { throw new Error("must not save"); },
    now: () => new Date(),
    async acquireLease() { return 1; },
    async renewLease() { return false; },
    async releaseLease() {},
    inFlight: new Map(),
  };
  await assert.rejects(buildAiSummary({ ...distributedOptions, subjectKey: "lost-before-model", dependencies: lostLease }), MistralSummaryError);
  assert.equal(lostLeaseCalls, 0, "known lease loss must fail before a paid Mistral call");

  let superseded = false;
  const winnerDocument: AiSummaryDocument = {
    subjectType: "drug",
    subjectKey: "fenced-save",
    snapshotHash: snapshotHash(drugInput),
    promptVersion: AI_PROMPT_VERSION,
    model: "test-model",
    generationToken: 2,
    summary: safeSummary,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  };
  const fencedSave: AiSummaryDependencies = {
    client: { model: "test-model", async summarize() { return safeSummary; } },
    async getCached() { return superseded ? winnerDocument : null; },
    async save() { superseded = true; return false; },
    now: () => new Date(),
    async acquireLease() { return 1; },
    async renewLease() { return true; },
    async releaseLease() {},
    inFlight: new Map(),
  };
  const fencedResult = await buildAiSummary({ ...distributedOptions, subjectKey: "fenced-save", dependencies: fencedSave });
  assert.equal(fencedResult.cacheStatus, "hit", "a stale fenced write must return the newer cached winner");
  assert.equal("generationToken" in fencedResult, false, "lease fencing tokens must remain internal");

  let raceReads = 0;
  let raceModelCalls = 0;
  const postAcquireWinner = { ...winnerDocument, subjectKey: "post-acquire-race" };
  const postAcquireRace: AiSummaryDependencies = {
    client: { model: "test-model", async summarize() { raceModelCalls += 1; return safeSummary; } },
    async getCached() { raceReads += 1; return raceReads >= 3 ? postAcquireWinner : null; },
    async save() { throw new Error("must not save"); },
    now: () => new Date(),
    async acquireLease() { return 3; },
    async renewLease() { return true; },
    async releaseLease() {},
    inFlight: new Map(),
  };
  const raceResult = await buildAiSummary({ ...distributedOptions, subjectKey: "post-acquire-race", dependencies: postAcquireRace });
  assert.equal(raceResult.cacheStatus, "hit");
  assert.equal(raceModelCalls, 0, "a cache winner saved just before lease acquisition must prevent duplicate generation");

  const failedCleanup: AiSummaryDependencies = {
    client: { model: "test-model", async summarize() { return safeSummary; } },
    async getCached() { return null; },
    async save() { return true; },
    now: () => new Date(),
    async acquireLease() { return 4; },
    async renewLease() { return true; },
    async releaseLease() { throw new Error("synthetic cleanup outage"); },
    inFlight: new Map(),
  };
  const cleanupResult = await buildAiSummary({ ...distributedOptions, subjectKey: "cleanup-outage", dependencies: failedCleanup });
  assert.equal(cleanupResult.cacheStatus, "miss", "lease cleanup failure must not override a successfully saved summary");

  await assert.rejects(
    enforceAiSummaryBuildLimit(new Headers(), { now: 0, store: { async increment() { return 31; } } }),
    (error: unknown) => error instanceof AiSummaryRateLimitExceededError && error.retryAfterSeconds === 600,
    "AI quota failures must retain a distinct error type and retry interval",
  );

  console.log("AI summary cache, enforced output policy, response validation, failure recovery, and single-flight checks passed.");
}

void main();
