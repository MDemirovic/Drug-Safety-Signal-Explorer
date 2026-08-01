import type { ObjectId } from "mongodb";

export type SavedReportDocument = {
  _id?: ObjectId;
  userId: string;
  drugSlug: string;
  normalizedName: string;
  rxcui: string | null;
  totalReports: number;
  seriousReports: number;
  nonSeriousReports: number;
  snapshotComputedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type SavedReportPayload = Omit<
  SavedReportDocument,
  "_id" | "userId" | "snapshotComputedAt" | "createdAt" | "updatedAt"
> & {
  id: string;
  snapshotComputedAt: string;
  createdAt: string;
  updatedAt: string;
};
