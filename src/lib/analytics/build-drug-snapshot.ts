import "server-only";

import {
  getFreshDrugSnapshot,
  getDrugIdentityByAlias,
  saveDrugIdentity,
  saveDrugSnapshot,
} from "@/lib/cache/drug-cache";
import {
  buildDrugAliasKey,
  buildDrugCacheKey,
} from "@/lib/cache/drug-cache-key";
import {
  getDrugLabel,
  getSeriousnessBreakdown,
  getSeriousnessCounts,
  getTopReactions,
  getYearlyTrend,
} from "@/lib/openfda/client";
import { normalizeDrugName } from "@/lib/rxnorm";
import type { NormalizedDrug } from "@/lib/rxnorm/normalize";
import type {
  DrugIdentity,
  DrugSnapshot,
  DrugSnapshotResult,
} from "@/types/drug-snapshot";

const SNAPSHOT_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const FIRST_FAERS_YEAR = 2004;
const FAERS_LIMITATION =
  "FAERS reports are spontaneous adverse event reports. They do not prove that a drug caused an event and cannot be used to estimate real-world incidence or personal risk.";

const globalForSnapshots = globalThis as typeof globalThis & {
  drugSnapshotBuilds?: Map<string, Promise<DrugSnapshotResult>>;
};
const inFlightBuilds =
  globalForSnapshots.drugSnapshotBuilds ??
  new Map<string, Promise<DrugSnapshotResult>>();
globalForSnapshots.drugSnapshotBuilds = inFlightBuilds;

export type DrugSnapshotDependencies = {
  normalize: typeof normalizeDrugName;
  getCached: typeof getFreshDrugSnapshot;
  getIdentityByAlias: (aliasKey: string) => Promise<DrugIdentity | null>;
  saveIdentity: typeof saveDrugIdentity;
  save: typeof saveDrugSnapshot;
  topReactions: typeof getTopReactions;
  seriousnessCounts: typeof getSeriousnessCounts;
  seriousnessBreakdown: typeof getSeriousnessBreakdown;
  yearlyTrend: typeof getYearlyTrend;
  drugLabel: typeof getDrugLabel;
  now: () => Date;
};

const defaultDependencies: DrugSnapshotDependencies = {
  normalize: normalizeDrugName,
  getCached: getFreshDrugSnapshot,
  getIdentityByAlias: getDrugIdentityByAlias,
  saveIdentity: saveDrugIdentity,
  save: saveDrugSnapshot,
  topReactions: getTopReactions,
  seriousnessCounts: getSeriousnessCounts,
  seriousnessBreakdown: getSeriousnessBreakdown,
  yearlyTrend: getYearlyTrend,
  drugLabel: getDrugLabel,
  now: () => new Date(),
};

export type BuildDrugSnapshotOptions = {
  forceRefresh?: boolean;
  dependencies?: DrugSnapshotDependencies;
  beforeBuild?: () => void | Promise<void>;
  knownIdentity?: Pick<
    DrugIdentity,
    "canonicalSlug" | "normalizedName" | "slug" | "rxcui"
  >;
};

function withCacheStatus(
  snapshot: DrugSnapshot,
  cacheStatus: DrugSnapshotResult["cacheStatus"],
): DrugSnapshotResult {
  return { ...snapshot, cacheStatus };
}

export async function buildDrugSnapshot(
  inputName: string,
  options: BuildDrugSnapshotOptions = {},
): Promise<DrugSnapshotResult> {
  const dependencies = options.dependencies ?? defaultDependencies;
  const aliasKey = buildDrugAliasKey(inputName);
  const aliasIdentity = options.knownIdentity
    ? null
    : await dependencies.getIdentityByAlias(aliasKey);
  const knownIdentity = options.knownIdentity ?? aliasIdentity;
  const now = dependencies.now();
  let expensiveWorkAuthorized = false;
  async function persistRecoveredSlugAlias(snapshot: DrugSnapshot) {
    if (
      knownIdentity &&
      !knownIdentity.rxcui &&
      knownIdentity.slug !== snapshot.slug
    ) {
      await dependencies.saveIdentity(snapshot, undefined, knownIdentity.slug);
    }
  }

  if (!options.forceRefresh && aliasIdentity?.rxcui) {
    const cached = await dependencies.getCached(
      aliasIdentity.cacheKey,
      now,
      aliasIdentity.normalizedName,
      aliasIdentity.rxcui,
    );
    if (cached) {
      await dependencies.saveIdentity(cached, aliasKey);
      await persistRecoveredSlugAlias(cached);
      return withCacheStatus(cached, "hit");
    }
  }

  let normalized: NormalizedDrug;
  if (knownIdentity?.rxcui) {
    normalized = {
      inputName,
      normalizedName: knownIdentity.normalizedName,
      slug: knownIdentity.canonicalSlug ?? knownIdentity.slug,
      rxcui: knownIdentity.rxcui,
      source: "rxnorm",
    };
  } else {
    await options.beforeBuild?.();
    expensiveWorkAuthorized = true;
    normalized = await dependencies.normalize(inputName);
  }
  const cacheKey = buildDrugCacheKey(normalized);

  if (!options.forceRefresh) {
    const cached = await dependencies.getCached(
      cacheKey,
      now,
      normalized.normalizedName,
      normalized.rxcui,
    );
    if (cached) {
      await dependencies.saveIdentity(cached, aliasKey);
      await persistRecoveredSlugAlias(cached);
      return withCacheStatus(cached, "hit");
    }
  }

  const existingBuild = inFlightBuilds.get(cacheKey);
  if (existingBuild) {
    const snapshot = await existingBuild;
    await dependencies.saveIdentity(snapshot, aliasKey);
    await persistRecoveredSlugAlias(snapshot);
    return snapshot;
  }

  const build = (async () => {
    if (!expensiveWorkAuthorized) {
      await options.beforeBuild?.();
    }
    const toYear = now.getUTCFullYear();
    const [topReactions, seriousness, breakdown, yearlyTrend, label] =
      await Promise.all([
        dependencies.topReactions(normalized.normalizedName, 20),
        dependencies.seriousnessCounts(normalized.normalizedName),
        dependencies.seriousnessBreakdown(normalized.normalizedName),
        dependencies.yearlyTrend(
          normalized.normalizedName,
          FIRST_FAERS_YEAR,
          toYear,
        ),
        dependencies.drugLabel(normalized.normalizedName).catch((error) => {
          console.error(
            `Drug label lookup failed for "${normalized.normalizedName}".`,
            error,
          );
          return null;
        }),
      ]);

    const snapshot: DrugSnapshot = {
      cacheKey,
      normalizedName: normalized.normalizedName,
      slug: normalized.slug,
      rxcui: normalized.rxcui,
      totalReports: seriousness.total,
      seriousReports: seriousness.serious,
      nonSeriousReports: seriousness.nonSerious,
      unknownSeriousnessReports: seriousness.unknown,
      topReactions,
      seriousnessBreakdown: breakdown,
      yearlyTrend,
      label,
      sourceMeta: {
        eventSource: "openFDA FAERS Drug Event API",
        labelSource: "openFDA Drug Label API",
        normalizationSource:
          normalized.source === "rxnorm" ? "RxNorm" : "fallback",
        aggregateOnly: true,
        fromYear: FIRST_FAERS_YEAR,
        toYear,
        limitation: FAERS_LIMITATION,
      },
      computedAt: now,
      expiresAt: new Date(now.getTime() + SNAPSHOT_TTL_MS),
    };

    await dependencies.save(snapshot, aliasKey);
    await persistRecoveredSlugAlias(snapshot);

    return withCacheStatus(
      snapshot,
      options.forceRefresh ? "refreshed" : "miss",
    );
  })();

  inFlightBuilds.set(cacheKey, build);
  try {
    return await build;
  } finally {
    if (inFlightBuilds.get(cacheKey) === build) {
      inFlightBuilds.delete(cacheKey);
    }
  }
}

export { FAERS_LIMITATION, SNAPSHOT_TTL_MS };
