export type ReactionCount = {
  term: string;
  count: number;
};

export type SeriousnessCountsSnapshot = {
  total: number;
  serious: number;
  nonSerious: number;
  unknown: number;
};

export type SeriousnessBreakdownSnapshot = {
  death: number;
  lifeThreatening: number;
  hospitalization: number;
  disability: number;
  congenitalAnomaly: number;
  otherSerious: number;
};

export type YearlyReportCount = {
  year: number;
  count: number;
};

export type DrugLabelSnapshot = {
  effectiveTime?: string;
  setId?: string;
  brandNames: string[];
  genericNames: string[];
  manufacturerNames: string[];
  productTypes: string[];
  routes: string[];
  boxedWarning: string[];
  warnings: string[];
  adverseReactions: string[];
  indicationsAndUsage: string[];
};

export type DrugSnapshot = {
  cacheKey: string;
  normalizedName: string;
  slug: string;
  rxcui: string | null;
  totalReports: number;
  seriousReports: number;
  nonSeriousReports: number;
  unknownSeriousnessReports: number;
  topReactions: ReactionCount[];
  seriousnessBreakdown: SeriousnessBreakdownSnapshot;
  yearlyTrend: YearlyReportCount[];
  label: DrugLabelSnapshot | null;
  sourceMeta: {
    eventSource: "openFDA FAERS Drug Event API";
    labelSource: "openFDA Drug Label API";
    normalizationSource: "RxNorm" | "fallback";
    aggregateOnly: true;
    fromYear: number;
    toYear: number;
    limitation: string;
  };
  computedAt: Date;
  expiresAt: Date;
};

export type DrugSnapshotResult = DrugSnapshot & {
  cacheStatus: "hit" | "miss" | "refreshed";
};

export type DrugSnapshotDocument = Omit<DrugSnapshot, "cacheKey"> & {
  cacheKey?: string;
  inputName?: string;
};

export type DrugIdentity = {
  aliasKeys?: string[];
  cacheKey: string;
  canonicalSlug?: string;
  normalizedName: string;
  slug: string;
  rxcui: string | null;
  updatedAt: Date;
};
