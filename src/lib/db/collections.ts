import "server-only";

import type { Collection, Db, Document } from "mongodb";

import { getDatabase } from "@/lib/db/mongodb";

export const COLLECTION_NAMES = {
  drugSnapshots: "drug_snapshots",
  comparisonSnapshots: "comparison_snapshots",
  aiSummaries: "ai_summaries",
  savedReports: "saved_reports",
  apiLogs: "api_logs",
  searchLogs: "search_logs",
} as const;

export type AppCollections = {
  [Name in keyof typeof COLLECTION_NAMES]: Collection<Document>;
};

export async function getCollections(database?: Db): Promise<AppCollections> {
  const db = database ?? (await getDatabase());

  return {
    drugSnapshots: db.collection(COLLECTION_NAMES.drugSnapshots),
    comparisonSnapshots: db.collection(COLLECTION_NAMES.comparisonSnapshots),
    aiSummaries: db.collection(COLLECTION_NAMES.aiSummaries),
    savedReports: db.collection(COLLECTION_NAMES.savedReports),
    apiLogs: db.collection(COLLECTION_NAMES.apiLogs),
    searchLogs: db.collection(COLLECTION_NAMES.searchLogs),
  };
}
