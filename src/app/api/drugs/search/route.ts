import { NextRequest, NextResponse } from "next/server";

import { buildDrugSnapshot } from "@/lib/analytics/build-drug-snapshot";
import { logDrugSearch } from "@/lib/analytics/search-log";
import {
  drugSearchSchema,
  snapshotErrorResponse,
} from "@/lib/analytics/snapshot-api";
import {
  enforceDrugRequestIngressLimit,
  enforceDrugSnapshotBuildLimit,
  RateLimitExceededError,
} from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  const rawName = request.nextUrl.searchParams.get("name") ?? "";
  try {
    await enforceDrugRequestIngressLimit(request.headers);
    const input = drugSearchSchema.parse({ name: rawName });
    const snapshot = await buildDrugSnapshot(input.name, {
      beforeBuild: () => enforceDrugSnapshotBuildLimit(request.headers),
    });
    await logDrugSearch({
      query: input.name,
      slug: snapshot.slug,
      cacheStatus: snapshot.cacheStatus,
      outcome: "success",
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    if (!(error instanceof RateLimitExceededError)) {
      await logDrugSearch({
        query: rawName.trim().slice(0, 120),
        outcome: "error",
        errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      });
    }
    return snapshotErrorResponse(error);
  }
}
