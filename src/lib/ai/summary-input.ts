import "server-only";

import type { ComparisonSnapshotResult } from "@/types/comparison-snapshot";
import type { DrugSnapshotResult } from "@/types/drug-snapshot";

export function drugSummaryInput(snapshot: DrugSnapshotResult) {
  return {
    drug: {
      normalizedName: snapshot.normalizedName,
      totalReports: snapshot.totalReports,
      seriousReports: snapshot.seriousReports,
      nonSeriousReports: snapshot.nonSeriousReports,
      unknownSeriousnessReports: snapshot.unknownSeriousnessReports,
    },
    topReactions: snapshot.topReactions.slice(0, 10),
    seriousnessBreakdown: snapshot.seriousnessBreakdown,
    yearlyTrend: snapshot.yearlyTrend,
    labelContext: snapshot.label
      ? {
          routes: snapshot.label.routes.slice(0, 5),
          boxedWarning: snapshot.label.boxedWarning.slice(0, 1).map((text) => text.slice(0, 1_200)),
          warnings: snapshot.label.warnings.slice(0, 2).map((text) => text.slice(0, 1_200)),
        }
      : null,
    sourceMeta: snapshot.sourceMeta,
  };
}

export function comparisonSummaryInput(snapshot: ComparisonSnapshotResult) {
  return {
    drugA: snapshot.drugA,
    drugB: snapshot.drugB,
    overlappingReactions: snapshot.overlappingReactions.slice(0, 10),
    uniqueReactionsA: snapshot.uniqueReactionsA.slice(0, 10),
    uniqueReactionsB: snapshot.uniqueReactionsB.slice(0, 10),
    yearlyTrend: snapshot.yearlyTrend,
    sourceMeta: snapshot.sourceMeta,
  };
}
