"use client";

import { Bookmark, CalendarDays, ExternalLink, FileText, LoaderCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SavedReportPayload } from "@/types/saved-report";

const integer = new Intl.NumberFormat("en-US");
const savedDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function ReportCard({
  report,
  onDelete,
}: {
  report: SavedReportPayload;
  onDelete: (id: string) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const seriousShare = report.totalReports
    ? Math.round((report.seriousReports / report.totalReports) * 100)
    : 0;

  return (
    <article className="group rounded-[1.5rem] border border-[var(--line)] bg-white p-6 shadow-[0_16px_45px_rgba(16,53,58,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(16,53,58,0.1)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--signal-pale)] text-[var(--signal-dark)]">
          <Bookmark className="h-5 w-5" />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isDeleting}
          onClick={async () => {
            setIsDeleting(true);
            await onDelete(report.id).finally(() => setIsDeleting(false));
          }}
          aria-label={`Delete ${report.normalizedName} saved report`}
        >
          {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
      <p className="eyebrow mt-6">Saved signal profile</p>
      <h2 className="font-display mt-2 text-3xl leading-none text-[var(--ink)] capitalize">{report.normalizedName}</h2>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[var(--paper)] p-4">
          <p className="text-[0.65rem] font-bold tracking-[0.12em] text-[var(--muted)] uppercase">Reports</p>
          <p className="mt-1 text-lg font-bold text-[var(--ink)]">{integer.format(report.totalReports)}</p>
        </div>
        <div className="rounded-xl bg-[var(--warning-bg)] p-4">
          <p className="text-[0.65rem] font-bold tracking-[0.12em] text-[var(--warning)] uppercase">Serious share</p>
          <p className="mt-1 text-lg font-bold text-[var(--ink)]">{seriousShare}%</p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs text-[var(--muted)]">
        <CalendarDays className="h-4 w-4" />
        Saved {savedDate.format(new Date(report.createdAt))}
      </div>
      <Link href={`/drug/${report.drugSlug}`} className={cn(buttonVariants({ variant: "outline" }), "mt-6 w-full")}>
        View report <ExternalLink className="h-4 w-4" />
      </Link>
    </article>
  );
}

export function SavedReportsList({ initialReports }: { initialReports: SavedReportPayload[] }) {
  const [reports, setReports] = useState(initialReports);
  const [error, setError] = useState("");

  async function deleteReport(id: string) {
    setError("");
    try {
      const response = await fetch(`/api/saved-reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The report could not be deleted.");
      setReports((current) => current.filter((report) => report.id !== id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The report could not be deleted.");
    }
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-[1.8rem] border border-dashed border-[var(--line)] bg-white/70 px-6 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--signal-pale)] text-[var(--signal-dark)]"><FileText className="h-6 w-6" /></div>
        <h2 className="font-display mt-6 text-3xl text-[var(--ink)]">No reports saved yet.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">Explore a drug signal profile and save it here for quick access later.</p>
        <Link href="/" className={cn(buttonVariants(), "mt-7")}>Explore drugs</Link>
      </div>
    );
  }

  return (
    <>
      {error && <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{error}</p>}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => <ReportCard key={report.id} report={report} onDelete={deleteReport} />)}
      </div>
    </>
  );
}
