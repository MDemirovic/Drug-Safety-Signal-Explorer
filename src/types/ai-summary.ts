export type AiSummaryContent = {
  overview: string;
  keyObservations: string[];
  limitations: string;
};

export type AiSummaryDocument = {
  subjectType: "drug" | "comparison";
  subjectKey: string;
  snapshotHash: string;
  promptVersion: string;
  model: string;
  generationToken: number;
  summary: AiSummaryContent;
  createdAt: Date;
  expiresAt: Date;
};

export type AiSummaryPayload = Omit<AiSummaryDocument, "createdAt" | "expiresAt" | "generationToken"> & {
  createdAt: string;
  cacheStatus: "hit" | "miss";
};

export type AiSummaryLeaseDocument = {
  _id: string;
  owner: string;
  leaseUntil: Date;
  generation: number;
  cleanupAt: Date;
};
