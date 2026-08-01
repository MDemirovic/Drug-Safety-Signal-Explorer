import "server-only";

import { createHash } from "node:crypto";

import { buildDrugSnapshot } from "@/lib/analytics/build-drug-snapshot";
import {
  getFreshComparisonSnapshot,
  saveComparisonSnapshot,
} from "@/lib/cache/comparison-cache";
import type {
  ComparisonSnapshot,
  ComparisonSnapshotDocument,
  ComparisonSnapshotResult,
} from "@/types/comparison-snapshot";
import type { DrugSnapshotResult } from "@/types/drug-snapshot";

const COMPARISON_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const COMPARISON_LIMITATION =
  "Raw FAERS report counts are not adjusted for exposure and do not prove causality or that one drug is safer than another.";

export class ComparisonInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComparisonInputError";
  }
}

export function normalizeComparisonInput(value: string) {
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > 120 || /\p{Cc}/u.test(normalized)) {
    throw new ComparisonInputError("Please provide two valid drug names.");
  }
  return normalized;
}

export function buildComparisonKey(left: string, right: string) {
  return [left, right]
    .map((value) => value.toLocaleLowerCase("en-US"))
    .sort((a, b) => a.localeCompare(b, "en-US"))
    .join("::");
}

export function buildComparisonRequestKey(left: string, right: string) {
  const ordered = [left, right]
    .map((value) => value.toLocaleLowerCase("en-US"))
    .sort((a, b) => a.localeCompare(b, "en-US"));
  return `request:${createHash("sha256").update(JSON.stringify(ordered)).digest("hex")}`;
}

function seriousShare(snapshot: DrugSnapshotResult) {
  return snapshot.totalReports
    ? snapshot.seriousReports / snapshot.totalReports
    : 0;
}

function summarize(snapshot: DrugSnapshotResult) {
  return {
    normalizedName: snapshot.normalizedName,
    slug: snapshot.slug,
    rxcui: snapshot.rxcui,
    totalReports: snapshot.totalReports,
    seriousReports: snapshot.seriousReports,
    seriousShare: seriousShare(snapshot),
  };
}

function compareSnapshots(
  first: DrugSnapshotResult,
  second: DrugSnapshotResult,
  comparisonKey: string,
  requestKey: string,
  now: Date,
): ComparisonSnapshot {
  const [drugA, drugB] = [first, second].sort((left, right) =>
    left.slug.localeCompare(right.slug, "en-US"),
  );
  const reactionsA = new Map(drugA.topReactions.map((item) => [item.term, item.count]));
  const reactionsB = new Map(drugB.topReactions.map((item) => [item.term, item.count]));
  const overlapTerms = [...reactionsA.keys()]
    .filter((term) => reactionsB.has(term))
    .sort(
      (left, right) =>
        (reactionsA.get(right) ?? 0) + (reactionsB.get(right) ?? 0) -
          ((reactionsA.get(left) ?? 0) + (reactionsB.get(left) ?? 0)) ||
        left.localeCompare(right, "en-US"),
    );
  const uniqueReactionsA = drugA.topReactions.filter(
    (item) => !reactionsB.has(item.term),
  );
  const uniqueReactionsB = drugB.topReactions.filter(
    (item) => !reactionsA.has(item.term),
  );
  const trendA = new Map(drugA.yearlyTrend.map((item) => [item.year, item.count]));
  const trendB = new Map(drugB.yearlyTrend.map((item) => [item.year, item.count]));
  const years = [...new Set([...trendA.keys(), ...trendB.keys()])].sort(
    (left, right) => left - right,
  );

  return {
    comparisonKey,
    drugA: summarize(drugA),
    drugB: summarize(drugB),
    overlappingReactions: overlapTerms.map((term) => ({
      term,
      countA: reactionsA.get(term) ?? 0,
      countB: reactionsB.get(term) ?? 0,
    })),
    uniqueReactionsA,
    uniqueReactionsB,
    yearlyTrend: years.map((year) => ({
      year,
      countA: trendA.get(year) ?? 0,
      countB: trendB.get(year) ?? 0,
    })),
    sourceMeta: {
      aggregateOnly: true,
      eventSource: "openFDA FAERS Drug Event API",
      limitation: COMPARISON_LIMITATION,
    },
    computedAt: now,
    expiresAt: new Date(now.getTime() + COMPARISON_TTL_MS),
  };
}

export type ComparisonDependencies = {
  buildDrug: (
    inputName: string,
    options?: { beforeBuild?: () => void | Promise<void> },
  ) => Promise<DrugSnapshotResult>;
  getCached: (
    key: string,
    now?: Date,
  ) => Promise<ComparisonSnapshotDocument | null>;
  save: (
    snapshot: ComparisonSnapshot,
    requestKey: string,
  ) => Promise<void>;
  now: () => Date;
};

const defaultDependencies: ComparisonDependencies = {
  buildDrug: buildDrugSnapshot,
  getCached: getFreshComparisonSnapshot,
  save: saveComparisonSnapshot,
  now: () => new Date(),
};

const globalForComparisons = globalThis as typeof globalThis & {
  comparisonBuilds?: Map<string, Promise<ComparisonSnapshotResult>>;
};
const inFlightBuilds =
  globalForComparisons.comparisonBuilds ??
  new Map<string, Promise<ComparisonSnapshotResult>>();
globalForComparisons.comparisonBuilds = inFlightBuilds;

function snapshotFromDocument(
  document: ComparisonSnapshotDocument,
): ComparisonSnapshot {
  return {
    comparisonKey: document.comparisonKey,
    drugA: document.drugA,
    drugB: document.drugB,
    overlappingReactions: document.overlappingReactions,
    uniqueReactionsA: document.uniqueReactionsA,
    uniqueReactionsB: document.uniqueReactionsB,
    yearlyTrend: document.yearlyTrend,
    sourceMeta: document.sourceMeta,
    computedAt: document.computedAt,
    expiresAt: document.expiresAt,
  };
}

function cachedResult(
  document: ComparisonSnapshotDocument,
): ComparisonSnapshotResult {
  return { ...snapshotFromDocument(document), cacheStatus: "hit" };
}

export async function buildComparisonSnapshot(
  drugAInput: string,
  drugBInput: string,
  options: {
    dependencies?: ComparisonDependencies;
    beforeDrugBuild?: () => void | Promise<void>;
  } = {},
): Promise<ComparisonSnapshotResult> {
  const drugAName = normalizeComparisonInput(drugAInput);
  const drugBName = normalizeComparisonInput(drugBInput);
  if (
    drugAName.toLocaleLowerCase("en-US") ===
    drugBName.toLocaleLowerCase("en-US")
  ) {
    throw new ComparisonInputError("Choose two different drugs to compare.");
  }
  const requestKey = buildComparisonRequestKey(drugAName, drugBName);

  const dependencies = options.dependencies ?? defaultDependencies;
  const now = dependencies.now();
  const cachedByRequest = await dependencies.getCached(requestKey, now);
  if (cachedByRequest) return cachedResult(cachedByRequest);

  const existingBuild = inFlightBuilds.get(requestKey);
  if (existingBuild) return existingBuild;

  const build = (async () => {
    const [first, second] = await Promise.all([
      dependencies.buildDrug(drugAName, { beforeBuild: options.beforeDrugBuild }),
      dependencies.buildDrug(drugBName, { beforeBuild: options.beforeDrugBuild }),
    ]);
    if (first.slug === second.slug) {
      throw new ComparisonInputError("Choose two different drugs to compare.");
    }

    const comparisonKey = buildComparisonKey(first.slug, second.slug);
    const cachedByCanonicalKey = await dependencies.getCached(comparisonKey, now);
    if (cachedByCanonicalKey) {
      await dependencies.save(snapshotFromDocument(cachedByCanonicalKey), requestKey);
      return cachedResult(cachedByCanonicalKey);
    }

    const snapshot = compareSnapshots(
      first,
      second,
      comparisonKey,
      requestKey,
      now,
    );
    await dependencies.save(snapshot, requestKey);
    return { ...snapshot, cacheStatus: "miss" as const };
  })();

  inFlightBuilds.set(requestKey, build);
  try {
    return await build;
  } finally {
    if (inFlightBuilds.get(requestKey) === build) inFlightBuilds.delete(requestKey);
  }
}

export { COMPARISON_LIMITATION, COMPARISON_TTL_MS };
