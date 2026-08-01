import "server-only";

import type { Collection, Db, Document } from "mongodb";

import { getDatabase } from "@/lib/db/mongodb";
import type {
  DrugIdentity,
  DrugSnapshotDocument,
} from "@/types/drug-snapshot";

export const COLLECTION_NAMES = {
  drugSnapshots: "drug_snapshots",
  drugIdentities: "drug_identities",
  comparisonSnapshots: "comparison_snapshots",
  aiSummaries: "ai_summaries",
  savedReports: "saved_reports",
  apiLogs: "api_logs",
  searchLogs: "search_logs",
} as const;

export type AppCollections = {
  drugSnapshots: Collection<DrugSnapshotDocument>;
  drugIdentities: Collection<DrugIdentity>;
  comparisonSnapshots: Collection<Document>;
  aiSummaries: Collection<Document>;
  savedReports: Collection<Document>;
  apiLogs: Collection<Document>;
  searchLogs: Collection<Document>;
};

export async function getCollections(database?: Db): Promise<AppCollections> {
  const db = database ?? (await getDatabase());

  return {
    drugSnapshots: db.collection<DrugSnapshotDocument>(
      COLLECTION_NAMES.drugSnapshots,
    ),
    drugIdentities: db.collection<DrugIdentity>(
      COLLECTION_NAMES.drugIdentities,
    ),
    comparisonSnapshots: db.collection(COLLECTION_NAMES.comparisonSnapshots),
    aiSummaries: db.collection(COLLECTION_NAMES.aiSummaries),
    savedReports: db.collection(COLLECTION_NAMES.savedReports),
    apiLogs: db.collection(COLLECTION_NAMES.apiLogs),
    searchLogs: db.collection(COLLECTION_NAMES.searchLogs),
  };
}
