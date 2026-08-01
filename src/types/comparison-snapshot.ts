import type { ReactionCount, YearlyReportCount } from "@/types/drug-snapshot";

export type ComparisonDrugSummary = {
  normalizedName: string;
  slug: string;
  rxcui: string | null;
  totalReports: number;
  seriousReports: number;
  seriousShare: number;
};

export type OverlappingReaction = {
  term: string;
  countA: number;
  countB: number;
};

export type ComparisonYear = {
  year: number;
  countA: number;
  countB: number;
};

export type ComparisonSnapshot = {
  comparisonKey: string;
  drugA: ComparisonDrugSummary;
  drugB: ComparisonDrugSummary;
  overlappingReactions: OverlappingReaction[];
  uniqueReactionsA: ReactionCount[];
  uniqueReactionsB: ReactionCount[];
  yearlyTrend: ComparisonYear[];
  sourceMeta: {
    aggregateOnly: true;
    eventSource: "openFDA FAERS Drug Event API";
    limitation: string;
  };
  computedAt: Date;
  expiresAt: Date;
};

export type ComparisonSnapshotDocument = ComparisonSnapshot & {
  requestKeys: string[];
};

export type ComparisonSnapshotResult = ComparisonSnapshot & {
  cacheStatus: "hit" | "miss";
};

export type { YearlyReportCount };
