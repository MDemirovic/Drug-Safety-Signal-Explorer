import "server-only";

import type { Collection } from "mongodb";

import { getCollections } from "@/lib/db/collections";
import type { AiSummaryDocument } from "@/types/ai-summary";

const LEASE_RECORD_TTL_MS = 31 * 24 * 60 * 60_000;

async function collection(override?: Collection<AiSummaryDocument>) {
  if (override) return override;
  return (await getCollections()).aiSummaries;
}

export async function getCachedAiSummary(
  key: Pick<AiSummaryDocument, "subjectType" | "subjectKey" | "snapshotHash" | "promptVersion" | "model">,
  override?: Collection<AiSummaryDocument>,
) {
  return (await collection(override)).findOne({ ...key, expiresAt: { $gt: new Date() } });
}

export async function saveAiSummary(
  summary: AiSummaryDocument,
  override?: Collection<AiSummaryDocument>,
) {
  try {
    const result = await (await collection(override)).updateOne(
      {
        subjectType: summary.subjectType,
        subjectKey: summary.subjectKey,
        snapshotHash: summary.snapshotHash,
        promptVersion: summary.promptVersion,
        model: summary.model,
        $or: [
          { generationToken: { $lte: summary.generationToken } },
          { generationToken: { $exists: false } },
          { expiresAt: { $lte: summary.createdAt } },
        ],
      },
      { $set: summary },
      { upsert: true },
    );
    return result.matchedCount === 1 || result.upsertedCount === 1;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return false;
    throw error;
  }
}

export async function acquireAiSummaryLease(
  leaseKey: string,
  owner: string,
  now: Date,
  leaseUntil: Date,
) {
  const { aiSummaryLeases } = await getCollections();
  try {
    const result = await aiSummaryLeases.findOneAndUpdate(
      { _id: leaseKey, $or: [{ leaseUntil: { $lte: now } }, { owner }] },
      {
        $set: {
          owner,
          leaseUntil,
          cleanupAt: new Date(now.getTime() + LEASE_RECORD_TTL_MS),
        },
        $inc: { generation: 1 },
      },
      { upsert: true, returnDocument: "after" },
    );
    return result?.owner === owner ? result.generation : null;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return null;
    throw error;
  }
}

export async function releaseAiSummaryLease(leaseKey: string, owner: string) {
  const { aiSummaryLeases } = await getCollections();
  await aiSummaryLeases.updateOne(
    { _id: leaseKey, owner },
    { $set: { owner: "", leaseUntil: new Date(0) } },
  );
}

export async function renewAiSummaryLease(
  leaseKey: string,
  owner: string,
  leaseUntil: Date,
) {
  const { aiSummaryLeases } = await getCollections();
  const result = await aiSummaryLeases.updateOne(
    { _id: leaseKey, owner },
    { $set: { leaseUntil } },
  );
  return result.matchedCount === 1;
}
