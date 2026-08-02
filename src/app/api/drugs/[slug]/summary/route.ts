import { NextResponse } from "next/server";

import { buildAiSummary } from "@/lib/ai/build-ai-summary";
import { drugSummaryInput } from "@/lib/ai/summary-input";
import { buildDrugSnapshot } from "@/lib/analytics/build-drug-snapshot";
import { drugSlugSchema, snapshotErrorResponse } from "@/lib/analytics/snapshot-api";
import { getDrugIdentityBySlug, getDrugSnapshotBySlug } from "@/lib/cache/drug-cache";
import { MistralSummaryError } from "@/lib/ai/mistral-client";
import {
  AiSummaryRateLimitExceededError,
  enforceAiSummaryBuildLimit,
  enforceDrugRequestIngressLimit,
  enforceDrugSnapshotBuildLimit,
} from "@/lib/security/rate-limit";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    await enforceDrugRequestIngressLimit(request.headers);
    const { slug: rawSlug } = await context.params;
    const slug = drugSlugSchema.parse(rawSlug.toLowerCase());
    const [identity, storedSnapshot] = await Promise.all([
      getDrugIdentityBySlug(slug),
      getDrugSnapshotBySlug(slug),
    ]);
    if (!identity) return NextResponse.json({ error: "Drug snapshot not found." }, { status: 404 });
    const snapshot = storedSnapshot
      && storedSnapshot.cacheKey === identity.cacheKey
      && storedSnapshot.expiresAt.getTime() > Date.now()
      ? { ...storedSnapshot, cacheStatus: "hit" as const }
      : await buildDrugSnapshot(identity.normalizedName, {
          knownIdentity: identity,
          forceRefresh: Boolean(storedSnapshot),
          beforeBuild: () => enforceDrugSnapshotBuildLimit(request.headers),
        });
    const summary = await buildAiSummary({
      subjectType: "drug",
      subjectKey: snapshot.slug,
      snapshot: drugSummaryInput(snapshot),
      expiresAt: snapshot.expiresAt,
      beforeGenerate: () => enforceAiSummaryBuildLimit(request.headers),
    });
    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof AiSummaryRateLimitExceededError) {
      return NextResponse.json(
        { error: "Too many AI summary requests. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    if (error instanceof MistralSummaryError) {
      return NextResponse.json({ error: "AI summary is temporarily unavailable." }, { status: 503 });
    }
    return snapshotErrorResponse(error);
  }
}
