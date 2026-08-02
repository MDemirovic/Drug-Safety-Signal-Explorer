import { NextRequest, NextResponse } from "next/server";

import { buildAiSummary } from "@/lib/ai/build-ai-summary";
import { MistralSummaryError } from "@/lib/ai/mistral-client";
import { comparisonSummaryInput } from "@/lib/ai/summary-input";
import { buildComparisonSnapshot, ComparisonInputError } from "@/lib/analytics/build-comparison-snapshot";
import { snapshotErrorResponse } from "@/lib/analytics/snapshot-api";
import {
  AiSummaryRateLimitExceededError,
  createComparisonSnapshotBuildAuthorizer,
  enforceAiSummaryBuildLimit,
  enforceDrugRequestIngressLimit,
} from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  try {
    await enforceDrugRequestIngressLimit(request.headers);
    const drugA = request.nextUrl.searchParams.get("drugA") ?? "";
    const drugB = request.nextUrl.searchParams.get("drugB") ?? "";
    const snapshot = await buildComparisonSnapshot(drugA, drugB, {
      beforeDrugBuild: createComparisonSnapshotBuildAuthorizer(request.headers),
    });
    const summary = await buildAiSummary({
      subjectType: "comparison",
      subjectKey: snapshot.comparisonKey,
      snapshot: comparisonSummaryInput(snapshot),
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
    if (error instanceof ComparisonInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof MistralSummaryError) {
      return NextResponse.json({ error: "AI summary is temporarily unavailable." }, { status: 503 });
    }
    return snapshotErrorResponse(error);
  }
}
