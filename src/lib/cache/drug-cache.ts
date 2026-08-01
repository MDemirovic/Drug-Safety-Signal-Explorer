import "server-only";

import type { Collection } from "mongodb";

import { getCollections } from "@/lib/db/collections";
import { buildDrugCacheKey } from "@/lib/cache/drug-cache-key";
import type {
  DrugIdentity,
  DrugSnapshot,
  DrugSnapshotDocument,
} from "@/types/drug-snapshot";

type StoredDrugSnapshot = DrugSnapshotDocument;

async function collection() {
  const collections = await getCollections();
  return collections.drugSnapshots;
}

async function identityCollection() {
  const collections = await getCollections();
  return collections.drugIdentities;
}

export function toDrugSnapshot(document: StoredDrugSnapshot): DrugSnapshot {
  return {
    cacheKey: document.cacheKey ?? buildDrugCacheKey(document),
    normalizedName: document.normalizedName,
    slug: document.slug,
    rxcui: document.rxcui,
    totalReports: document.totalReports,
    seriousReports: document.seriousReports,
    nonSeriousReports: document.nonSeriousReports,
    unknownSeriousnessReports: document.unknownSeriousnessReports,
    topReactions: document.topReactions,
    seriousnessBreakdown: document.seriousnessBreakdown,
    yearlyTrend: document.yearlyTrend,
    label: document.label,
    sourceMeta: document.sourceMeta,
    computedAt: document.computedAt,
    expiresAt: document.expiresAt,
  };
}

export async function getFreshDrugSnapshot(
  cacheKey: string,
  now = new Date(),
  normalizedName?: string,
  rxcui?: string | null,
): Promise<DrugSnapshot | null> {
  const snapshots = await collection();
  return getFreshDrugSnapshotFromCollection(
    snapshots,
    cacheKey,
    now,
    normalizedName,
    rxcui,
  );
}

export async function getFreshDrugSnapshotFromCollection(
  snapshots: Pick<Collection<DrugSnapshotDocument>, "findOne" | "updateOne">,
  cacheKey: string,
  now = new Date(),
  normalizedName?: string,
  rxcui?: string | null,
): Promise<DrugSnapshot | null> {
  const document = await snapshots.findOne({
    expiresAt: { $gt: now },
    $or: [
      { cacheKey },
      ...(normalizedName
        ? [{ cacheKey: { $exists: false }, normalizedName, rxcui: rxcui ?? null }]
        : []),
    ],
  }, { sort: { computedAt: -1 } });

  if (document && !document.cacheKey) {
    await snapshots.updateOne(
      { _id: document._id },
      { $set: { cacheKey }, $unset: { inputName: "" } },
    );
  }

  return document ? toDrugSnapshot({ ...document, cacheKey }) : null;
}

export async function saveDrugSnapshot(
  snapshot: DrugSnapshot,
  aliasKey?: string,
) {
  const snapshots = await collection();
  await saveDrugIdentity(snapshot, aliasKey);
  await saveDrugSnapshotToCollection(snapshots, snapshot);
}

export async function saveDrugIdentity(
  snapshot: DrugSnapshot,
  aliasKey?: string,
  identitySlug = snapshot.slug,
) {
  const identities = await identityCollection();
  await saveDrugIdentityToCollection(
    identities,
    snapshot,
    aliasKey,
    identitySlug,
  );
}

export async function saveDrugIdentityToCollection(
  identities: Pick<Collection<DrugIdentity>, "updateMany" | "updateOne">,
  snapshot: DrugSnapshot,
  aliasKey?: string,
  identitySlug = snapshot.slug,
) {
  if (aliasKey) {
    await identities.updateMany(
      { slug: { $ne: identitySlug }, aliasKeys: aliasKey },
      { $pull: { aliasKeys: aliasKey } },
    );
    await identities.updateMany(
      { aliasKeys: { $size: 0 } },
      { $unset: { aliasKeys: "" } },
    );
  }

  await identities.updateOne(
    { slug: identitySlug },
    {
      $set: {
        cacheKey: snapshot.cacheKey,
        canonicalSlug: snapshot.slug,
        normalizedName: snapshot.normalizedName,
        slug: identitySlug,
        rxcui: snapshot.rxcui,
        updatedAt: snapshot.computedAt,
      },
      ...(aliasKey ? { $addToSet: { aliasKeys: aliasKey } } : {}),
    },
    { upsert: true },
  );
}

export async function saveDrugSnapshotToCollection(
  snapshots: Pick<Collection<DrugSnapshotDocument>, "updateOne">,
  snapshot: DrugSnapshot,
) {
  await snapshots.updateOne(
    { slug: snapshot.slug },
    { $set: snapshot, $unset: { inputName: "" } },
    { upsert: true },
  );
}

export async function getDrugSnapshotBySlug(slug: string) {
  const snapshots = await collection();
  const document = await snapshots.findOne({ slug });
  return document ? toDrugSnapshot(document) : null;
}

export async function getDrugIdentityBySlug(slug: string) {
  const identities = await identityCollection();
  return identities.findOne({ slug });
}

export async function getDrugIdentityByAlias(aliasKey: string) {
  const identities = await identityCollection();
  return identities.findOne({ aliasKeys: aliasKey });
}
