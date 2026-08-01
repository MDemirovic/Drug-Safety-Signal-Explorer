import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { deleteReportForUser } from "@/lib/saved-reports/store";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const { id } = await context.params;
    const deleted = await deleteReportForUser(userId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Saved report not found." }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Saved report could not be deleted.", error);
    return NextResponse.json({ error: "The report could not be deleted right now." }, { status: 503 });
  }
}
