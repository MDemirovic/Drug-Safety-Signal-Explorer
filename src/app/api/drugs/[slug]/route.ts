import { NextResponse } from "next/server";

import { buildDrugSnapshot } from "@/lib/analytics/build-drug-snapshot";
import { logDrugSearch } from "@/lib/analytics/search-log";
import {
  drugSlugSchema,
  snapshotErrorResponse,
} from "@/lib/analytics/snapshot-api";
import {
  getDrugIdentityBySlug,
  getDrugSnapshotBySlug,
  saveDrugIdentity,
} from "@/lib/cache/drug-cache";
import {
  enforceDrugRequestIngressLimit,
  enforceDrugSnapshotBuildLimit,
  RateLimitExceededError,
} from "@/lib/security/rate-limit";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  let query = "";

  try {
    await enforceDrugRequestIngressLimit(request.headers);
    const { slug: rawSlug } = await context.params;
    const slug = drugSlugSchema.parse(rawSlug.toLowerCase());
    const [storedSnapshot, storedIdentity] = await Promise.all([
      getDrugSnapshotBySlug(slug),
      getDrugIdentityBySlug(slug),
    ]);
    const redirectIdentity =
      storedIdentity?.canonicalSlug && storedIdentity.canonicalSlug !== slug
        ? storedIdentity
        : null;
    const effectiveSnapshot = redirectIdentity ? null : storedSnapshot;
    const refreshIdentity =
      redirectIdentity ?? effectiveSnapshot ?? storedIdentity;

    if (!refreshIdentity) {
      await logDrugSearch({
        query: slug,
        slug,
        outcome: "error",
        errorCode: "SNAPSHOT_NOT_FOUND",
      });
      return NextResponse.json(
        {
          error:
            "No cached snapshot was found. Search for the drug first to prepare one.",
        },
        { status: 404 },
      );
    }

    query = refreshIdentity.normalizedName;
    let snapshot;
    if (
      effectiveSnapshot &&
      effectiveSnapshot.expiresAt.getTime() > Date.now()
    ) {
      await saveDrugIdentity(effectiveSnapshot);
      snapshot = { ...effectiveSnapshot, cacheStatus: "hit" as const };
    } else {
      snapshot = await buildDrugSnapshot(query, {
        forceRefresh: Boolean(effectiveSnapshot),
        knownIdentity: refreshIdentity,
        beforeBuild: () => enforceDrugSnapshotBuildLimit(request.headers),
      });
    }
    await logDrugSearch({
      query,
      slug: snapshot.slug,
      cacheStatus: snapshot.cacheStatus,
      outcome: "success",
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    if (!(error instanceof RateLimitExceededError)) {
      await logDrugSearch({
        query,
        outcome: "error",
        errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      });
    }
    return snapshotErrorResponse(error);
  }
}
