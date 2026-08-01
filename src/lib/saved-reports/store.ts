import "server-only";

import { ObjectId, type Collection } from "mongodb";

import { getCollections } from "@/lib/db/collections";
import type { SavedReportDocument, SavedReportPayload } from "@/types/saved-report";
import type { DrugSnapshot } from "@/types/drug-snapshot";

async function savedReportsCollection(
  override?: Collection<SavedReportDocument>,
) {
  if (override) return override;
  const collections = await getCollections();
  return collections.savedReports;
}

export function toSavedReportPayload(
  report: SavedReportDocument & { _id: ObjectId },
): SavedReportPayload {
  return {
    id: report._id.toHexString(),
    drugSlug: report.drugSlug,
    normalizedName: report.normalizedName,
    rxcui: report.rxcui,
    totalReports: report.totalReports,
    seriousReports: report.seriousReports,
    nonSeriousReports: report.nonSeriousReports,
    snapshotComputedAt: report.snapshotComputedAt.toISOString(),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export async function saveReportForUser(
  userId: string,
  snapshot: DrugSnapshot,
  options: {
    collection?: Collection<SavedReportDocument>;
    now?: Date;
  } = {},
) {
  const reports = await savedReportsCollection(options.collection);
  const now = options.now ?? new Date();

  await reports.updateOne(
    { userId, drugSlug: snapshot.slug },
    {
      $set: {
        normalizedName: snapshot.normalizedName,
        rxcui: snapshot.rxcui,
        totalReports: snapshot.totalReports,
        seriousReports: snapshot.seriousReports,
        nonSeriousReports: snapshot.nonSeriousReports,
        snapshotComputedAt: snapshot.computedAt,
        updatedAt: now,
      },
      $setOnInsert: {
        userId,
        drugSlug: snapshot.slug,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const saved = await reports.findOne({ userId, drugSlug: snapshot.slug });
  if (!saved?._id) throw new Error("The saved report could not be read back.");
  return toSavedReportPayload(saved as SavedReportDocument & { _id: ObjectId });
}

export async function listReportsForUser(
  userId: string,
  collection?: Collection<SavedReportDocument>,
) {
  const reports = await savedReportsCollection(collection);
  const documents = await reports.find({ userId }).sort({ createdAt: -1 }).toArray();
  return documents
    .filter((report): report is SavedReportDocument & { _id: ObjectId } => Boolean(report._id))
    .map(toSavedReportPayload);
}

export async function deleteReportForUser(
  userId: string,
  reportId: string,
  collection?: Collection<SavedReportDocument>,
) {
  if (!ObjectId.isValid(reportId)) return false;
  const reports = await savedReportsCollection(collection);
  const result = await reports.deleteOne({
    _id: new ObjectId(reportId),
    userId,
  });
  return result.deletedCount === 1;
}
