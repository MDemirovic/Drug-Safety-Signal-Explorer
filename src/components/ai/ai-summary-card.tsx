"use client";

import { AlertTriangle, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { AiSummaryPayload } from "@/types/ai-summary";

export function AiSummaryCard({ endpoint }: { endpoint: string }) {
  return <AiSummaryCardRequest key={endpoint} endpoint={endpoint} />;
}

function AiSummaryCardRequest({ endpoint }: { endpoint: string }) {
  const [summary, setSummary] = useState<AiSummaryPayload | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as AiSummaryPayload | { error?: string };
        if (!response.ok) throw new Error("error" in body && body.error ? body.error : "AI summary is temporarily unavailable.");
        return body as AiSummaryPayload;
      })
      .then(setSummary)
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name !== "AbortError") setError(caught.message);
      });
    return () => controller.abort();
  }, [attempt, endpoint]);

  if (error) {
    return (
      <section className="rounded-[1.6rem] border border-[var(--line)] bg-white p-6 shadow-[0_18px_55px_rgba(16,53,58,0.07)] sm:p-8" aria-label="AI summary unavailable">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--warning-bg)] text-[var(--warning)]"><AlertTriangle className="h-5 w-5" /></div>
          <div><p className="eyebrow">AI-generated overview</p><h2 className="font-display mt-2 text-2xl text-[var(--ink)]">Summary temporarily unavailable</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{error} Core metrics remain available and unaffected.</p><Button variant="outline" className="mt-5" onClick={() => { setError(""); setSummary(null); setAttempt((value) => value + 1); }}><RefreshCw className="h-4 w-4" />Try summary again</Button></div>
        </div>
      </section>
    );
  }

  if (!summary) return <section className="rounded-[1.6rem] border border-[var(--line)] bg-white p-6 shadow-[0_18px_55px_rgba(16,53,58,0.07)] sm:p-8" aria-label="Loading AI summary"><div className="flex items-center gap-3 text-[var(--signal-dark)]"><LoaderCircle className="h-5 w-5 animate-spin" /><span className="text-sm font-semibold">Generating a grounded snapshot overview…</span></div></section>;

  return (
    <section className="relative overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-white p-6 shadow-[0_18px_55px_rgba(16,53,58,0.07)] sm:p-8" aria-label="AI-generated overview">
      <div className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-[var(--signal-pale)] blur-2xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="eyebrow flex items-center gap-2"><Sparkles className="h-4 w-4" />AI-generated overview</p><span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-3 py-1 text-[0.67rem] font-bold tracking-[0.12em] text-[var(--muted)] uppercase">{summary.cacheStatus === "hit" ? "Cached summary" : "Fresh summary"}</span></div>
        <p className="mt-5 max-w-5xl text-base leading-7 text-[var(--text)]">{summary.summary.overview}</p>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div><h3 className="text-xs font-bold tracking-[0.13em] text-[var(--muted)] uppercase">Key observations</h3><ul className="mt-3 grid gap-2 sm:grid-cols-2">{summary.summary.keyObservations.map((observation) => <li key={observation} className="rounded-xl bg-[var(--paper)] px-4 py-3 text-sm leading-6 text-[var(--text)]">{observation}</li>)}</ul></div>
          <div className="rounded-xl border border-[var(--warning-line)] bg-[var(--warning-bg)] p-4"><h3 className="text-xs font-bold tracking-[0.13em] text-[var(--warning)] uppercase">Interpret with care</h3><p className="mt-2 text-sm leading-6 text-[var(--ink)]">{summary.summary.limitations}</p></div>
        </div>
        <p className="mt-5 border-t border-[var(--line)] pt-4 text-xs leading-5 text-[var(--muted)]">Generated only from the aggregate snapshot shown here. This is not medical advice and does not establish causality, incidence, personal risk, or comparative safety.</p>
      </div>
    </section>
  );
}
