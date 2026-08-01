import { NextRequest, NextResponse } from "next/server";

import {
  buildComparisonSnapshot,
  ComparisonInputError,
} from "@/lib/analytics/build-comparison-snapshot";
import { snapshotErrorResponse } from "@/lib/analytics/snapshot-api";
import {
  createComparisonSnapshotBuildAuthorizer,
  enforceDrugRequestIngressLimit,
} from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  try {
    await enforceDrugRequestIngressLimit(request.headers);
    const drugA = request.nextUrl.searchParams.get("drugA") ?? "";
    const drugB = request.nextUrl.searchParams.get("drugB") ?? "";
    const authorizeDrugBuild = createComparisonSnapshotBuildAuthorizer(
      request.headers,
    );
    const snapshot = await buildComparisonSnapshot(drugA, drugB, {
      beforeDrugBuild: authorizeDrugBuild,
    });
    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof ComparisonInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return snapshotErrorResponse(error);
  }
}
