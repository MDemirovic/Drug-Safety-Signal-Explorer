import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { drugSlugSchema } from "@/lib/analytics/snapshot-api";
import { getDrugSnapshotBySlug } from "@/lib/cache/drug-cache";
import { listReportsForUser, saveReportForUser } from "@/lib/saved-reports/store";

const saveReportSchema = z.object({ slug: drugSlugSchema });

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    return NextResponse.json({ reports: await listReportsForUser(userId) });
  } catch (error) {
    console.error("Saved reports could not be loaded.", error);
    return NextResponse.json({ error: "Saved reports are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const { slug } = saveReportSchema.parse(await request.json());
    const snapshot = await getDrugSnapshotBySlug(slug);
    if (!snapshot) {
      return NextResponse.json({ error: "This drug snapshot is no longer available." }, { status: 404 });
    }
    const report = await saveReportForUser(userId, snapshot);
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "Please provide a valid drug report." }, { status: 400 });
    }
    console.error("Drug report could not be saved.", error);
    return NextResponse.json({ error: "The report could not be saved right now." }, { status: 503 });
  }
}
