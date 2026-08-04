import assert from "node:assert/strict";

import type { DrugSnapshotDependencies } from "../src/lib/analytics/build-drug-snapshot";
import type {
  DrugIdentity,
  DrugSnapshot,
  DrugSnapshotDocument,
} from "../src/types/drug-snapshot";

async function main() {
  const [
    { buildDrugSnapshot, SNAPSHOT_TTL_MS },
    { buildDrugCacheKey },
    {
      saveDrugIdentityToCollection,
      saveDrugSnapshotToCollection,
      getFreshDrugSnapshotFromCollection,
      toDrugSnapshot,
    },
    {
      consumeRateLimit,
      enforceDrugSnapshotBuildLimit,
      RateLimitExceededError,
      requestClientIdentifier,
    },
    { drugSearchSchema },
    { ObjectId },
    { uniqueOwnerIds },
  ] =
    await Promise.all([
      import("../src/lib/analytics/build-drug-snapshot"),
      import("../src/lib/cache/drug-cache-key"),
      import("../src/lib/cache/drug-cache"),
      import("../src/lib/security/rate-limit"),
      import("../src/lib/analytics/snapshot-api"),
      import("mongodb"),
      import("../src/lib/db/identity-index-migration"),
    ]);

  const newestOwner = new ObjectId();
  const olderOwner = new ObjectId();
  assert.deepEqual(
    uniqueOwnerIds([newestOwner, newestOwner, olderOwner]),
    [newestOwner, olderOwner],
  );

  const now = new Date("2026-08-01T12:00:00.000Z");
  let cached: DrugSnapshot | null = null;
  let aggregateCalls = 0;
  let saveCalls = 0;
  let identitySaveCalls = 0;
  const identitySaveSlugs: string[] = [];
  const savedAliasKeys: string[] = [];
  let normalizeCalls = 0;
  let failNextLabelLookup = true;
  let cachedIdentity: DrugIdentity | null = null;
  let lastCacheKey = "";

  const dependencies: DrugSnapshotDependencies = {
    normalize: async (input: string) => {
      normalizeCalls += 1;
      return {
        inputName: input.trim(),
        normalizedName: "omeprazole",
        slug: "omeprazole",
        rxcui: "7646",
        source: "rxnorm" as const,
      };
    },
    getCached: async (cacheKey) => {
      lastCacheKey = cacheKey;
      return cached?.cacheKey === cacheKey ? cached : null;
    },
    getIdentityByAlias: async () => cachedIdentity,
    saveIdentity: async (snapshot, aliasKey, identitySlug = snapshot.slug) => {
      identitySaveCalls += 1;
      identitySaveSlugs.push(identitySlug);
      if (aliasKey) savedAliasKeys.push(aliasKey);
      cachedIdentity = {
        aliasKeys: aliasKey ? [aliasKey] : [],
        cacheKey: snapshot.cacheKey,
        canonicalSlug: snapshot.slug,
        normalizedName: snapshot.normalizedName,
        slug: identitySlug,
        rxcui: snapshot.rxcui,
        updatedAt: snapshot.computedAt,
      };
    },
    save: async (snapshot, aliasKey) => {
      saveCalls += 1;
      if (aliasKey) savedAliasKeys.push(aliasKey);
      cached = snapshot;
      cachedIdentity = {
        aliasKeys: aliasKey ? [aliasKey] : [],
        cacheKey: snapshot.cacheKey,
        canonicalSlug: snapshot.slug,
        normalizedName: snapshot.normalizedName,
        slug: snapshot.slug,
        rxcui: snapshot.rxcui,
        updatedAt: snapshot.computedAt,
      };
    },
    topReactions: async () => {
      aggregateCalls += 1;
      return [{ term: "NAUSEA", count: 120 }];
    },
    seriousnessCounts: async () => {
      aggregateCalls += 1;
      return { total: 200, serious: 80, nonSerious: 120, unknown: 0 };
    },
    seriousnessBreakdown: async () => {
      aggregateCalls += 1;
      return {
        death: 10,
        lifeThreatening: 5,
        hospitalization: 40,
        disability: 3,
        congenitalAnomaly: 1,
        otherSerious: 30,
      };
    },
    yearlyTrend: async () => {
      aggregateCalls += 1;
      return [{ year: 2026, count: 25 }];
    },
    drugLabel: async () => {
      aggregateCalls += 1;
      if (failNextLabelLookup) {
        failNextLabelLookup = false;
        throw new Error("simulated optional label outage");
      }
      return null;
    },
    now: () => now,
  };

  const first = await buildDrugSnapshot(" Omeprazole ", { dependencies });
  assert.equal(first.cacheStatus, "miss");
  assert.equal(first.totalReports, 200);
  assert.equal(first.label, null, "missing label data must remain non-fatal");
  assert.equal(first.sourceMeta.aggregateOnly, true);
  assert.match(first.sourceMeta.limitation, /do not prove/i);
  assert.equal(first.expiresAt.getTime() - now.getTime(), SNAPSHOT_TTL_MS);
  assert.equal(aggregateCalls, 5);
  assert.equal(saveCalls, 1);
  assert.equal(identitySaveCalls, 0);
  assert.equal(lastCacheKey, "rxcui:7646");

  const second = await buildDrugSnapshot("omeprazole", { dependencies });
  assert.equal(second.cacheStatus, "hit");
  assert.equal(aggregateCalls, 5, "cache hits must not call external APIs");
  assert.equal(saveCalls, 1);
  assert.equal(
    identitySaveCalls,
    1,
    "fresh legacy cache hits must backfill durable slug identities",
  );
  assert.equal(normalizeCalls, 1, "cache hits must not call RxNorm");

  const refreshed = await buildDrugSnapshot("omeprazole", {
    dependencies,
    forceRefresh: true,
  });
  assert.equal(refreshed.cacheStatus, "refreshed");
  assert.equal(aggregateCalls, 10);
  assert.equal(saveCalls, 2);

  const normalizationCallsBeforeKnownRefresh = normalizeCalls;
  const knownIdentityRefresh = await buildDrugSnapshot("omeprazole", {
    dependencies,
    forceRefresh: true,
    knownIdentity: {
      normalizedName: "omeprazole",
      slug: "omeprazole",
      rxcui: "7646",
    },
  });
  assert.equal(knownIdentityRefresh.rxcui, "7646");
  assert.equal(
    normalizeCalls,
    normalizationCallsBeforeKnownRefresh,
    "slug refreshes must preserve a previously verified RxCUI",
  );

  const aggregateCallsBeforeRecoveredAlias = aggregateCalls;
  const recoveredFallback = await buildDrugSnapshot("legacy fallback", {
    dependencies,
    knownIdentity: {
      normalizedName: "legacy fallback",
      slug: "legacy-fallback",
      rxcui: null,
    },
  });
  assert.equal(recoveredFallback.cacheStatus, "hit");
  assert.equal(aggregateCalls, aggregateCallsBeforeRecoveredAlias);
  assert.equal(recoveredFallback.slug, "omeprazole");
  assert.equal(identitySaveSlugs.at(-1), "legacy-fallback");
  const recoveredIdentity = cachedIdentity as DrugIdentity | null;
  assert.equal(recoveredIdentity?.canonicalSlug, "omeprazole");
  assert.equal(recoveredIdentity?.rxcui, "7646");

  const fallbackSnapshot: DrugSnapshot = {
    ...refreshed,
    cacheKey: "name:temporary-fallback",
    rxcui: null,
    sourceMeta: {
      ...refreshed.sourceMeta,
      normalizationSource: "fallback",
    },
  };
  cached = fallbackSnapshot;
  cachedIdentity = {
    aliasKeys: ["alias:temporary"],
    cacheKey: fallbackSnapshot.cacheKey,
    canonicalSlug: fallbackSnapshot.slug,
    normalizedName: fallbackSnapshot.normalizedName,
    slug: fallbackSnapshot.slug,
    rxcui: null,
    updatedAt: fallbackSnapshot.computedAt,
  };
  const normalizationsBeforeFallbackRetry = normalizeCalls;
  const recoveredAlias = await buildDrugSnapshot("temporary fallback", {
    dependencies,
  });
  assert.equal(
    normalizeCalls,
    normalizationsBeforeFallbackRetry + 1,
    "fallback identities must retry RxNorm instead of becoming sticky",
  );
  assert.equal(recoveredAlias.slug, "omeprazole");
  const recoveredAliasIdentity = cachedIdentity as DrugIdentity | null;
  assert.equal(recoveredAliasIdentity?.slug, fallbackSnapshot.slug);
  assert.equal(recoveredAliasIdentity?.canonicalSlug, "omeprazole");
  assert.equal(recoveredAliasIdentity?.rxcui, "7646");

  const serialized = JSON.stringify(refreshed);
  assert.ok(!serialized.includes("patient.drug"));
  assert.ok(!serialized.includes("safetyreportid"));
  assert.ok(!Object.hasOwn(refreshed, "inputName"));

  const legacyDocument: DrugSnapshotDocument = {
    ...refreshed,
    inputName: "private previous query",
  };
  const sanitizedLegacyDocument = toDrugSnapshot(legacyDocument);
  assert.ok(!Object.hasOwn(sanitizedLegacyDocument, "inputName"));

  const legacyBackfills: Array<Record<string, unknown>> = [];
  const legacyQueries: Array<Record<string, unknown>> = [];
  const legacyCacheHit = await getFreshDrugSnapshotFromCollection(
    {
      findOne: async (filter?: unknown) => {
        legacyQueries.push(filter as Record<string, unknown>);
        return {
          ...legacyDocument,
          cacheKey: undefined,
          _id: "legacy-id",
        } as never;
      },
      updateOne: async (filter, update) => {
        legacyBackfills.push({ filter, update });
        return {} as never;
      },
    },
    "rxcui:7646",
    now,
    "omeprazole",
    "7646",
  );
  assert.equal(legacyCacheHit?.cacheKey, "rxcui:7646");
  assert.equal(legacyBackfills.length, 1);
  assert.deepEqual(
    (legacyQueries[0]?.$or as Array<Record<string, unknown>>)[1],
    {
      cacheKey: { $exists: false },
      normalizedName: "omeprazole",
      rxcui: "7646",
    },
  );

  const updateCalls: Array<{
    filter: Record<string, unknown>;
    update: Record<string, unknown>;
    options?: Record<string, unknown>;
  }> = [];
  await saveDrugSnapshotToCollection(
    {
      updateOne: async (filter, update, options) => {
        updateCalls.push({
          filter: filter as Record<string, unknown>,
          update: update as Record<string, unknown>,
          options: options as Record<string, unknown> | undefined,
        });
        return {} as never;
      },
    },
    refreshed,
  );
  assert.deepEqual(updateCalls[0]?.filter, { slug: "omeprazole" });
  assert.equal(updateCalls[0]?.options?.upsert, true);
  assert.equal(updateCalls.length, 1);

  const persistedSnapshots: DrugSnapshot[] = [];
  const transitionCollection = {
    updateOne: async (
      filter: { slug?: string },
      update: { $set?: DrugSnapshot },
    ) => {
      const existingIndex = persistedSnapshots.findIndex(
        (document) => document.slug === filter.slug,
      );
      const next = update.$set;
      assert.ok(next);
      if (existingIndex >= 0) {
        persistedSnapshots[existingIndex] = next;
      } else {
        persistedSnapshots.push(next);
      }
      return {} as never;
    },
  };
  await saveDrugSnapshotToCollection(transitionCollection, {
    ...refreshed,
    cacheKey: "name:fallback",
    rxcui: null,
  });
  await saveDrugSnapshotToCollection(transitionCollection, refreshed);
  assert.equal(persistedSnapshots.length, 1);
  assert.equal(persistedSnapshots[0]?.cacheKey, "rxcui:7646");

  await saveDrugSnapshotToCollection(transitionCollection, {
    ...refreshed,
    slug: "old-preferred-name",
  });
  await saveDrugSnapshotToCollection(transitionCollection, {
    ...refreshed,
    cacheKey: "name:fallback",
    slug: "new-preferred-name",
    rxcui: null,
  });
  await saveDrugSnapshotToCollection(transitionCollection, {
    ...refreshed,
    slug: "new-preferred-name",
  });
  assert.equal(persistedSnapshots.length, 3);
  assert.equal(
    persistedSnapshots.find((item) => item.slug === "new-preferred-name")
      ?.cacheKey,
    "rxcui:7646",
  );

  const identityUpdateCalls: Array<{
    operation: "updateMany" | "updateOne";
    filter: Record<string, unknown>;
    update: Record<string, unknown>;
    options?: Record<string, unknown>;
  }> = [];
  await saveDrugIdentityToCollection(
    {
      updateMany: async (filter, update) => {
        identityUpdateCalls.push({
          operation: "updateMany",
          filter: filter as Record<string, unknown>,
          update: update as Record<string, unknown>,
        });
        return {} as never;
      },
      updateOne: async (filter, update, options) => {
        identityUpdateCalls.push({
          operation: "updateOne",
          filter: filter as Record<string, unknown>,
          update: update as Record<string, unknown>,
          options: options as Record<string, unknown> | undefined,
        });
        return {} as never;
      },
    },
    refreshed,
    "alias:test",
  );
  assert.deepEqual(identityUpdateCalls[0]?.filter, {
    slug: { $ne: "omeprazole" },
    aliasKeys: "alias:test",
  });
  assert.deepEqual(identityUpdateCalls[0]?.update, {
    $pull: { aliasKeys: "alias:test" },
  });
  assert.deepEqual(identityUpdateCalls[1]?.filter, {
    aliasKeys: { $size: 0 },
  });
  assert.deepEqual(identityUpdateCalls[1]?.update, {
    $unset: { aliasKeys: "" },
  });
  assert.deepEqual(identityUpdateCalls[2]?.filter, {
    slug: "omeprazole",
  });
  assert.equal(identityUpdateCalls[2]?.options?.upsert, true);
  assert.deepEqual(identityUpdateCalls[2]?.update.$addToSet, {
    aliasKeys: "alias:test",
  });
  assert.deepEqual(
    (identityUpdateCalls[2]?.update.$set as Record<string, unknown>).slug,
    "omeprazole",
  );

  const transitionedIdentity: Record<string, unknown> = {};
  const identityCollection = {
    updateMany: async () => ({} as never),
    updateOne: async (
      filter: Record<string, unknown>,
      update: { $set?: Record<string, unknown> },
    ) => {
      assert.equal(filter.slug, "omeprazole");
      Object.assign(transitionedIdentity, update.$set);
      return {} as never;
    },
  };
  await saveDrugIdentityToCollection(identityCollection, {
    ...refreshed,
    cacheKey: "name:fallback",
    rxcui: null,
  });
  await saveDrugIdentityToCollection(identityCollection, refreshed);
  assert.equal(transitionedIdentity.cacheKey, "rxcui:7646");
  assert.equal(transitionedIdentity.rxcui, "7646");

  cached = null;
  cachedIdentity = null;
  aggregateCalls = 0;
  saveCalls = 0;
  identitySaveCalls = 0;
  savedAliasKeys.length = 0;
  let buildAuthorizations = 0;
  const [concurrentA, concurrentB] = await Promise.all([
    buildDrugSnapshot("Prilosec", {
      dependencies,
      beforeBuild: () => {
        buildAuthorizations += 1;
      },
    }),
    buildDrugSnapshot("omeprazole", {
      dependencies,
      beforeBuild: () => {
        buildAuthorizations += 1;
      },
    }),
  ]);
  assert.equal(concurrentA.slug, "omeprazole");
  assert.equal(concurrentB.slug, "omeprazole");
  assert.equal(aggregateCalls, 5, "concurrent cache misses must share one build");
  assert.equal(saveCalls, 1);
  assert.equal(
    buildAuthorizations,
    2,
    "each unresolved alias must be authorized before RxNorm normalization",
  );
  assert.equal(new Set(savedAliasKeys).size, 2);

  const unavailableCacheDependencies: DrugSnapshotDependencies = {
    ...dependencies,
    getIdentityByAlias: async () => {
      throw new Error("simulated identity cache outage");
    },
    getCached: async () => {
      throw new Error("simulated snapshot cache outage");
    },
    saveIdentity: async () => {
      throw new Error("simulated identity cache outage");
    },
    save: async () => {
      throw new Error("simulated snapshot cache outage");
    },
  };
  const unavailableCacheResult = await buildDrugSnapshot(
    "Cache outage medicine",
    { dependencies: unavailableCacheDependencies },
  );
  assert.equal(unavailableCacheResult.cacheStatus, "miss");
  assert.equal(
    unavailableCacheResult.totalReports,
    200,
    "a cache outage must not prevent a live aggregate snapshot",
  );

  const rateCounts = new Map<string, number>();
  const rateStore = {
    increment: async ({ key, windowStart }: { key: string; windowStart: Date }) => {
      const bucketKey = `${key}:${windowStart.toISOString()}`;
      const count = (rateCounts.get(bucketKey) ?? 0) + 1;
      rateCounts.set(bucketKey, count);
      return count;
    },
  };
  const limitOptions = {
    scope: "snapshot-test",
    identifier: "client-a",
    limit: 2,
    windowMs: 1_000,
  };
  const firstLimit = await consumeRateLimit(limitOptions, {
    store: rateStore,
    now: 10_000,
  });
  const secondLimit = await consumeRateLimit(limitOptions, {
    store: rateStore,
    now: 10_100,
  });
  const blockedLimit = await consumeRateLimit(limitOptions, {
    store: rateStore,
    now: 10_200,
  });
  const resetLimit = await consumeRateLimit(limitOptions, {
    store: rateStore,
    now: 11_001,
  });
  assert.equal(firstLimit.allowed, true);
  assert.equal(secondLimit.allowed, true);
  assert.equal(blockedLimit.allowed, false);
  assert.equal(resetLimit.allowed, true);

  const firstClientHeaders = new Headers({
    "x-forwarded-for": "198.51.100.10",
  });
  const secondClientHeaders = new Headers({
    "x-forwarded-for": "198.51.100.11",
  });
  const sharedContext = {
    store: rateStore,
    now: 20_000,
    trustProxyHeaders: true,
  };
  await enforceDrugSnapshotBuildLimit(firstClientHeaders, sharedContext);
  await assert.rejects(
    enforceDrugSnapshotBuildLimit(firstClientHeaders, sharedContext),
    (error: unknown) => error instanceof RateLimitExceededError,
  );
  await enforceDrugSnapshotBuildLimit(secondClientHeaders, sharedContext);

  assert.equal(requestClientIdentifier(firstClientHeaders, false), null);
  assert.equal(requestClientIdentifier(secondClientHeaders, false), null);
  assert.notEqual(
    requestClientIdentifier(firstClientHeaders, true),
    requestClientIdentifier(secondClientHeaders, true),
  );
  assert.equal(
    requestClientIdentifier(
      new Headers({
        "x-forwarded-for": "198.51.100.10, 203.0.113.99",
      }),
      true,
    ),
    requestClientIdentifier(firstClientHeaders, true),
    "Render's first forwarding entry is the documented client address",
  );

  assert.notEqual(
    buildDrugCacheKey({ rxcui: null, normalizedName: "drug name" }),
    buildDrugCacheKey({ rxcui: null, normalizedName: "drug-name" }),
  );
  assert.equal(
    buildDrugCacheKey({ rxcui: "7646", normalizedName: "anything" }),
    "rxcui:7646",
  );

  assert.throws(
    () => drugSearchSchema.parse({ name: "\u0000" }),
    /control characters|too small/i,
  );
  assert.throws(
    () => drugSearchSchema.parse({ name: "ome\tprazole" }),
    /control characters/i,
  );
  assert.throws(
    () => drugSearchSchema.parse({ name: "ome\nprazole" }),
    /control characters/i,
  );
  assert.equal(
    drugSearchSchema.parse({ name: "  OMEPRAZOLE   magnesium " }).name,
    "OMEPRAZOLE magnesium",
  );

  console.log(
    "Drug snapshot cache and fallback, single-flight, rate-limit, privacy, refresh, TTL, and missing-label checks passed.",
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
