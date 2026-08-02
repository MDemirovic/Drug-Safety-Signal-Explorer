import "server-only";

import { z } from "zod";

import { buildDrugSnapshot } from "@/lib/analytics/build-drug-snapshot";
import { getDrugIdentityBySlug } from "@/lib/cache/drug-cache";
import { getCollections } from "@/lib/db/collections";
import type { DrugIdentity, DrugSnapshotResult } from "@/types/drug-snapshot";

const slugSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export class AdminSnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminSnapshotError";
  }
}

export type AdminCacheDependencies = {
  getIdentity(slug: string): Promise<DrugIdentity | null>;
  build(name: string, options: { forceRefresh: true; knownIdentity: DrugIdentity }): Promise<DrugSnapshotResult>;
  deleteSnapshot(slug: string): Promise<boolean>;
  invalidateComparisons(slug: string): Promise<void>;
};

const defaults: AdminCacheDependencies = {
  getIdentity: getDrugIdentityBySlug,
  build: (name, options) => buildDrugSnapshot(name, options),
  async deleteSnapshot(slug) {
    const { drugSnapshots } = await getCollections();
    return (await drugSnapshots.deleteOne({ slug })).deletedCount === 1;
  },
  async invalidateComparisons(slug) {
    const { comparisonSnapshots } = await getCollections();
    await comparisonSnapshots.deleteMany({
      $or: [{ "drugA.slug": slug }, { "drugB.slug": slug }],
    });
  },
};

function parseSlug(value: string) {
  const parsed = slugSchema.safeParse(value);
  if (!parsed.success) throw new AdminSnapshotError("Invalid snapshot slug.");
  return parsed.data;
}

export async function refreshAdminDrugSnapshot(rawSlug: string, dependencies: AdminCacheDependencies = defaults) {
  const slug = parseSlug(rawSlug);
  const identity = await dependencies.getIdentity(slug);
  if (!identity) throw new AdminSnapshotError("Drug identity was not found.");
  const snapshot = await dependencies.build(identity.normalizedName, { forceRefresh: true, knownIdentity: identity });
  if (snapshot.slug !== slug) await dependencies.deleteSnapshot(slug);
  await dependencies.invalidateComparisons(slug);
  if (snapshot.slug !== slug) await dependencies.invalidateComparisons(snapshot.slug);
  return snapshot;
}

export async function deleteAdminDrugSnapshot(rawSlug: string, dependencies: AdminCacheDependencies = defaults) {
  const slug = parseSlug(rawSlug);
  const deleted = await dependencies.deleteSnapshot(slug);
  if (deleted) await dependencies.invalidateComparisons(slug);
  return deleted;
}
