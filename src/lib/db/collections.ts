import "server-only";

import type { Collection, Db, Document } from "mongodb";

import { getDatabase } from "@/lib/db/mongodb";
import type {
  DrugIdentity,
  DrugSnapshotDocument,
} from "@/types/drug-snapshot";
import type { SavedReportDocument } from "@/types/saved-report";
import type { ComparisonSnapshotDocument } from "@/types/comparison-snapshot";
import type { AiSummaryDocument, AiSummaryLeaseDocument } from "@/types/ai-summary";

export const COLLECTION_NAMES = {
  drugSnapshots: "drug_snapshots",
  drugIdentities: "drug_identities",
  comparisonSnapshots: "comparison_snapshots",
  aiSummaries: "ai_summaries",
  aiSummaryLeases: "ai_summary_leases",
  savedReports: "saved_reports",
  apiLogs: "api_logs",
  searchLogs: "search_logs",
} as const;

export type AppCollections = {
  drugSnapshots: Collection<DrugSnapshotDocument>;
  drugIdentities: Collection<DrugIdentity>;
  comparisonSnapshots: Collection<ComparisonSnapshotDocument>;
  aiSummaries: Collection<AiSummaryDocument>;
  aiSummaryLeases: Collection<AiSummaryLeaseDocument>;
  savedReports: Collection<SavedReportDocument>;
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
    comparisonSnapshots: db.collection<ComparisonSnapshotDocument>(
      COLLECTION_NAMES.comparisonSnapshots,
    ),
    aiSummaries: db.collection<AiSummaryDocument>(COLLECTION_NAMES.aiSummaries),
    aiSummaryLeases: db.collection<AiSummaryLeaseDocument>(COLLECTION_NAMES.aiSummaryLeases),
    savedReports: db.collection<SavedReportDocument>(
      COLLECTION_NAMES.savedReports,
    ),
    apiLogs: db.collection(COLLECTION_NAMES.apiLogs),
    searchLogs: db.collection(COLLECTION_NAMES.searchLogs),
  };
}
