import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db/mongodb";
import { readDeploymentEnv } from "@/lib/env/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    readDeploymentEnv();
    const database = await getDatabase();
    await database.command({ ping: 1 });
    return NextResponse.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Readiness check failed.", error);
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
