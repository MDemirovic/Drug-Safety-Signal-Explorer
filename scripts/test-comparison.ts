import assert from "node:assert/strict";

import {
  buildComparisonKey,
  buildComparisonRequestKey,
  buildComparisonSnapshot,
  ComparisonInputError,
  COMPARISON_TTL_MS,
  type ComparisonDependencies,
} from "../src/lib/analytics/build-comparison-snapshot";
import type {
  ComparisonSnapshot,
  ComparisonSnapshotDocument,
} from "../src/types/comparison-snapshot";
import type { DrugSnapshotResult } from "../src/types/drug-snapshot";
import {
  createComparisonSnapshotBuildAuthorizer,
  RateLimitExceededError,
  type RateLimitStore,
} from "../src/lib/security/rate-limit";

function drug(
  normalizedName: string,
  slug: string,
  totalReports: number,
  seriousReports: number,
  reactions: Array<[string, number]>,
  yearlyTrend: Array<[number, number]>,
): DrugSnapshotResult {
  const now = new Date("2026-08-01T10:00:00.000Z");
  return {
    cacheKey: `rxcui:${slug}`,
    normalizedName,
    slug,
    rxcui: slug,
    totalReports,
    seriousReports,
    nonSeriousReports: totalReports - seriousReports,
    unknownSeriousnessReports: 0,
    topReactions: reactions.map(([term, count]) => ({ term, count })),
    seriousnessBreakdown: {
      death: 0,
      lifeThreatening: 0,
      hospitalization: 0,
      disability: 0,
      congenitalAnomaly: 0,
      otherSerious: seriousReports,
    },
    yearlyTrend: yearlyTrend.map(([year, count]) => ({ year, count })),
    label: null,
    sourceMeta: {
      eventSource: "openFDA FAERS Drug Event API",
      labelSource: "openFDA Drug Label API",
      normalizationSource: "RxNorm",
      aggregateOnly: true,
      fromYear: 2022,
      toYear: 2026,
      limitation: "Test limitation.",
    },
    computedAt: now,
    expiresAt: new Date(now.getTime() + 86_400_000),
    cacheStatus: "hit",
  };
}

const omeprazole = drug(
  "Omeprazole",
  "omeprazole",
  1000,
  250,
  [["NAUSEA", 100], ["HEADACHE", 80], ["ABDOMINAL_PAIN", 50]],
  [[2024, 300], [2025, 350]],
);
const ibuprofen = drug(
  "Ibuprofen",
  "ibuprofen",
  800,
  160,
  [["HEADACHE", 120], ["DIZZINESS", 60], ["NAUSEA", 50]],
  [[2025, 275], [2026, 310]],
);

function dependencies() {
  const cache = new Map<string, ComparisonSnapshotDocument>();
  let drugBuilds = 0;
  let comparisonSaves = 0;
  const now = new Date("2026-08-01T12:00:00.000Z");

  const deps: ComparisonDependencies = {
    async buildDrug(name) {
      drugBuilds += 1;
      const key = name.toLocaleLowerCase("en-US");
      if (key === "omeprazole" || key === "prilosec") return omeprazole;
      if (key === "ibuprofen" || key === "advil") return ibuprofen;
      return drug(name, key.replaceAll(" ", "-"), 10, 2, [], []);
    },
    async getCached(key, at = now) {
      return (
        [...cache.values()].find(
          (snapshot) =>
            snapshot.expiresAt > at &&
            (snapshot.comparisonKey === key || snapshot.requestKeys.includes(key)),
        ) ?? null
      );
    },
    async save(snapshot: ComparisonSnapshot, requestKey: string) {
      comparisonSaves += 1;
      const existing = cache.get(snapshot.comparisonKey);
      cache.set(snapshot.comparisonKey, {
        ...snapshot,
        requestKeys: [...new Set([...(existing?.requestKeys ?? []), requestKey])],
      });
    },
    now: () => now,
  };

  return {
    deps,
    cache,
    counts: () => ({ drugBuilds, comparisonSaves }),
    now,
  };
}

async function main() {
  assert.equal(
    buildComparisonKey("omeprazole", "ibuprofen"),
    buildComparisonKey("ibuprofen", "omeprazole"),
  );
  assert.equal(
    buildComparisonRequestKey("Prilosec", "Advil"),
    buildComparisonRequestKey("advil", "prilosec"),
  );
  assert.ok(
    !buildComparisonRequestKey("Prilosec", "Advil").includes("prilosec"),
    "request cache keys must not retain raw user input",
  );

  const harness = dependencies();
  const first = await buildComparisonSnapshot("Omeprazole", "Ibuprofen", {
    dependencies: harness.deps,
  });
  assert.equal(first.cacheStatus, "miss");
  assert.equal(first.comparisonKey, "ibuprofen::omeprazole");
  assert.equal(first.drugA.slug, "ibuprofen");
  assert.equal(first.drugB.slug, "omeprazole");
  assert.equal(first.drugA.seriousShare, 0.2);
  assert.equal(first.drugB.seriousShare, 0.25);
  assert.deepEqual(first.overlappingReactions, [
    { term: "HEADACHE", countA: 120, countB: 80 },
    { term: "NAUSEA", countA: 50, countB: 100 },
  ]);
  assert.deepEqual(first.uniqueReactionsA, [{ term: "DIZZINESS", count: 60 }]);
  assert.deepEqual(first.uniqueReactionsB, [{ term: "ABDOMINAL_PAIN", count: 50 }]);
  assert.deepEqual(first.yearlyTrend, [
    { year: 2024, countA: 0, countB: 300 },
    { year: 2025, countA: 275, countB: 350 },
    { year: 2026, countA: 310, countB: 0 },
  ]);
  assert.equal(first.expiresAt.getTime() - harness.now.getTime(), COMPARISON_TTL_MS);

  const reversed = await buildComparisonSnapshot("ibuprofen", "omeprazole", {
    dependencies: harness.deps,
  });
  assert.equal(reversed.cacheStatus, "hit");
  assert.equal(reversed.comparisonKey, first.comparisonKey);
  assert.deepEqual(harness.counts(), { drugBuilds: 2, comparisonSaves: 1 });

  const alias = await buildComparisonSnapshot("Prilosec", "Advil", {
    dependencies: harness.deps,
  });
  assert.equal(alias.cacheStatus, "hit", "canonical comparison cache must serve aliases");
  assert.equal(harness.counts().drugBuilds, 4);
  const stored = harness.cache.get(first.comparisonKey);
  assert.equal(stored?.requestKeys.length, 2, "alias request key must be linked to cache");

  await assert.rejects(
    () =>
      buildComparisonSnapshot("Prilosec", "Omeprazole", {
        dependencies: harness.deps,
      }),
    ComparisonInputError,
  );
  await assert.rejects(
    () => buildComparisonSnapshot("same", " SAME ", { dependencies: harness.deps }),
    ComparisonInputError,
  );

  if (!stored) throw new Error("Expected a stored comparison snapshot.");
  stored.expiresAt = new Date(harness.now.getTime() - 1);
  const refreshed = await buildComparisonSnapshot("Omeprazole", "Ibuprofen", {
    dependencies: harness.deps,
  });
  assert.equal(refreshed.cacheStatus, "miss", "an expired comparison must rebuild");
  assert.deepEqual(harness.counts(), { drugBuilds: 8, comparisonSaves: 3 });

  const concurrentHarness = dependencies();
  const [concurrentA, concurrentB] = await Promise.all([
    buildComparisonSnapshot("Concurrent A", "Concurrent B", {
      dependencies: concurrentHarness.deps,
    }),
    buildComparisonSnapshot("Concurrent B", "Concurrent A", {
      dependencies: concurrentHarness.deps,
    }),
  ]);
  assert.equal(concurrentA.comparisonKey, concurrentB.comparisonKey);
  assert.deepEqual(
    concurrentHarness.counts(),
    { drugBuilds: 2, comparisonSaves: 1 },
    "reversed concurrent requests must share one comparison build",
  );

  const rateCounts = new Map<string, number>();
  const rateStore: RateLimitStore = {
    async increment({ key }) {
      const count = (rateCounts.get(key) ?? 0) + 1;
      rateCounts.set(key, count);
      return count;
    },
  };
  const headers = new Headers({ "x-forwarded-for": "203.0.113.9" });
  const authorize = createComparisonSnapshotBuildAuthorizer(headers, {
    now: Date.parse("2026-08-01T12:00:00.000Z"),
    store: rateStore,
    trustProxyHeaders: true,
  });
  await Promise.all([authorize(), authorize()]);
  const clientEntry = [...rateCounts.entries()].find(([key]) =>
    key.startsWith("drug-snapshot-build-client:"),
  );
  assert.equal(clientEntry?.[1], 1, "one comparison must consume client quota once");
  assert.equal(
    rateCounts.get("drug-snapshot-build-global:all"),
    2,
    "two uncached drugs must each consume global build capacity",
  );
  await assert.rejects(authorize, RateLimitExceededError);

  const singleCounts = new Map<string, number>();
  const singleAuthorize = createComparisonSnapshotBuildAuthorizer(headers, {
    now: Date.parse("2026-08-01T12:01:00.000Z"),
    store: {
      async increment({ key }) {
        const count = (singleCounts.get(key) ?? 0) + 1;
        singleCounts.set(key, count);
        return count;
      },
    },
    trustProxyHeaders: true,
  });
  await singleAuthorize();
  assert.equal(singleCounts.get("drug-snapshot-build-global:all"), 1);
  assert.equal(
    [...singleCounts.entries()].find(([key]) =>
      key.startsWith("drug-snapshot-build-client:"),
    )?.[1],
    1,
  );

  const unavailableCacheHarness = dependencies();
  unavailableCacheHarness.deps.getCached = async () => {
    throw new Error("simulated comparison cache outage");
  };
  unavailableCacheHarness.deps.save = async () => {
    throw new Error("simulated comparison cache outage");
  };
  const uncachedResult = await buildComparisonSnapshot(
    "Cache outage A",
    "Cache outage B",
    { dependencies: unavailableCacheHarness.deps },
  );
  assert.equal(uncachedResult.cacheStatus, "miss");
  assert.equal(
    uncachedResult.comparisonKey,
    "cache-outage-a::cache-outage-b",
    "a cache outage must not prevent a live comparison",
  );

  console.log("Comparison ordering, cache fallback, privacy, overlap, trends, TTL, and distinct-drug checks passed.");
}

void main();
