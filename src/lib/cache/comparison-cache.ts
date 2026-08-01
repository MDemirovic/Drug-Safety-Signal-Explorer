import "server-only";

import type { Collection } from "mongodb";

import { getCollections } from "@/lib/db/collections";
import type {
  ComparisonSnapshot,
  ComparisonSnapshotDocument,
} from "@/types/comparison-snapshot";

function isDuplicateKey(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

async function collection(
  override?: Collection<ComparisonSnapshotDocument>,
) {
  if (override) return override;
  const collections = await getCollections();
  return collections.comparisonSnapshots;
}

export async function getFreshComparisonSnapshot(
  key: string,
  now = new Date(),
  override?: Collection<ComparisonSnapshotDocument>,
) {
  const snapshots = await collection(override);
  return snapshots.findOne({
    expiresAt: { $gt: now },
    $or: [{ comparisonKey: key }, { requestKeys: key }],
  });
}

export async function saveComparisonSnapshot(
  snapshot: ComparisonSnapshot,
  requestKey: string,
  override?: Collection<ComparisonSnapshotDocument>,
) {
  const snapshots = await collection(override);
  const update = {
    $set: snapshot,
    $addToSet: { requestKeys: requestKey },
  };
  try {
    await snapshots.updateOne(
      { comparisonKey: snapshot.comparisonKey },
      update,
      { upsert: true },
    );
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    await snapshots.updateOne(
      { comparisonKey: snapshot.comparisonKey },
      update,
    );
  }
}
