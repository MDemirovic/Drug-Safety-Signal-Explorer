import { auth } from "@clerk/nextjs/server";

import { SavedReportsList } from "@/components/saved-reports/saved-reports-list";
import { listReportsForUser } from "@/lib/saved-reports/store";

export default async function SavedReportsPage() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn({
      returnBackUrl: "/dashboard/saved-reports",
    });
  }

  const reports = await listReportsForUser(userId);

  return (
    <main className="relative flex-1 overflow-hidden px-5 py-12 sm:py-16">
      <div className="page-grid pointer-events-none absolute inset-x-0 top-0 h-[440px] opacity-70" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 max-w-3xl">
          <p className="eyebrow">Private workspace</p>
          <h1 className="font-display mt-4 text-5xl leading-[0.95] tracking-[-0.035em] text-[var(--ink)] sm:text-6xl">Saved signal reports</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">Return to drug profiles you want to monitor or review. Saved reports are visible only to your account.</p>
        </div>
        <SavedReportsList initialReports={reports} />
      </div>
    </main>
  );
}
