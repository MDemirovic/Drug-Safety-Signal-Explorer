"use client";

import {
  AlertTriangle,
  BarChart3,
  FileText,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AiSummaryCard } from "@/components/ai/ai-summary-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ComparisonSnapshotResult } from "@/types/comparison-snapshot";

type ComparisonPayload = Omit<
  ComparisonSnapshotResult,
  "computedAt" | "expiresAt"
> & {
  computedAt: string;
  expiresAt: string;
};

const integer = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[1.6rem] border border-[var(--line)] bg-white shadow-[0_18px_55px_rgba(16,53,58,0.07)] ${className}`}>{children}</section>;
}

function Heading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="mb-6"><p className="eyebrow mb-2">{eyebrow}</p><h2 className="font-display text-2xl leading-none text-[var(--ink)] sm:text-[1.7rem]">{title}</h2></div>;
}

function ComparisonForm({
  initialDrugA,
  initialDrugB,
}: {
  initialDrugA: string;
  initialDrugB: string;
}) {
  const router = useRouter();
  const [drugA, setDrugA] = useState(initialDrugA);
  const [drugB, setDrugB] = useState(initialDrugB);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const left = drugA.trim();
    const right = drugB.trim();
    if (!left || !right) return;
    router.push(`/compare?drugA=${encodeURIComponent(left)}&drugB=${encodeURIComponent(right)}`);
  }

  return (
    <div>
    <form onSubmit={submit} className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
      <label className="block">
        <span className="mb-2 block text-xs font-bold tracking-[0.12em] text-[var(--muted)] uppercase">First drug</span>
        <Input value={drugA} onChange={(event) => setDrugA(event.target.value)} placeholder="e.g. omeprazole" autoComplete="off" className="h-14 rounded-xl bg-white px-4" />
      </label>
      <label className="block">
        <span className="mb-2 block text-xs font-bold tracking-[0.12em] text-[var(--muted)] uppercase">Second drug</span>
        <Input value={drugB} onChange={(event) => setDrugB(event.target.value)} placeholder="e.g. ibuprofen" autoComplete="off" className="h-14 rounded-xl bg-white px-4" />
      </label>
      <Button type="submit" size="lg" disabled={!drugA.trim() || !drugB.trim()} className="h-14 rounded-xl px-7"><Search className="h-5 w-5" />Compare</Button>
    </form>
    <p className="mt-3 text-xs leading-5 text-[var(--muted)]">Results are arranged alphabetically so the same drug pair always has a stable presentation.</p>
    </div>
  );
}

function DrugMetricCard({
  drug,
  label,
  tone,
}: {
  drug: ComparisonPayload["drugA"];
  label: string;
  tone: "teal" | "amber";
}) {
  return (
    <Panel className="relative overflow-hidden p-6 sm:p-8">
      <div className={`absolute inset-x-0 top-0 h-1 ${tone === "teal" ? "bg-[var(--signal-dark)]" : "bg-[#d1764f]"}`} />
      <p className="text-[0.67rem] font-bold tracking-[0.16em] text-[var(--muted)] uppercase">Signal profile · {label}</p>
      <h2 className="font-display mt-3 text-4xl leading-none text-[var(--ink)] capitalize sm:text-5xl">{drug.normalizedName}</h2>
      <p className="mt-3 text-xs text-[var(--muted)]">RxCUI {drug.rxcui ?? "unavailable"}</p>
      <div className="mt-7 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[var(--paper)] p-4"><FileText className="mb-3 h-4 w-4 text-[var(--signal-dark)]" /><p className="text-[0.65rem] font-bold tracking-[0.12em] text-[var(--muted)] uppercase">Total reports</p><p className="mt-1 text-xl font-bold text-[var(--ink)]">{compact.format(drug.totalReports)}</p></div>
        <div className="rounded-xl bg-[var(--warning-bg)] p-4"><ShieldAlert className="mb-3 h-4 w-4 text-[var(--warning)]" /><p className="text-[0.65rem] font-bold tracking-[0.12em] text-[var(--warning)] uppercase">Serious reports</p><p className="mt-1 text-xl font-bold text-[var(--ink)]">{compact.format(drug.seriousReports)}</p></div>
      </div>
    </Panel>
  );
}

function SeriousShare({ snapshot }: { snapshot: ComparisonPayload }) {
  const rows = [
    { drug: snapshot.drugA, color: "bg-[var(--signal-dark)]" },
    { drug: snapshot.drugB, color: "bg-[#d1764f]" },
  ];
  return (
    <Panel className="p-6 sm:p-8">
      <Heading eyebrow="Case classification" title="Serious share of reports" />
      <div className="space-y-7">
        {rows.map(({ drug, color }) => <div key={drug.slug}><div className="mb-2 flex items-end justify-between gap-4"><span className="font-semibold text-[var(--text)] capitalize">{drug.normalizedName}</span><strong className="font-display text-2xl text-[var(--ink)]">{percent.format(drug.seriousShare)}</strong></div><div className="h-3 overflow-hidden rounded-full bg-[var(--paper-deep)]"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(Math.max(drug.seriousShare * 100, 0), 100)}%` }} /></div></div>)}
      </div>
      <p className="mt-6 text-xs leading-5 text-[var(--muted)]">This is the share within matching FAERS reports, not the share of exposed patients.</p>
    </Panel>
  );
}

function OverlapTable({ snapshot }: { snapshot: ComparisonPayload }) {
  return (
    <Panel className="overflow-hidden p-6 sm:p-8 lg:col-span-2">
      <Heading eyebrow="Shared reported terms" title="Overlapping reactions" />
      {snapshot.overlappingReactions.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper)] p-8 text-center text-sm text-[var(--muted)]">No overlap appears within the top reported terms for these snapshots.</div> : <div className="overflow-x-auto rounded-2xl border border-[var(--line)]"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-[var(--paper-deep)] text-[0.67rem] tracking-[0.13em] text-[var(--muted)] uppercase"><tr><th className="px-4 py-3">Reaction</th><th className="px-4 py-3 text-right capitalize">{snapshot.drugA.normalizedName}</th><th className="px-4 py-3 text-right capitalize">{snapshot.drugB.normalizedName}</th></tr></thead><tbody>{snapshot.overlappingReactions.map((reaction) => <tr key={reaction.term} className="border-t border-[var(--line)]"><td className="px-4 py-3 font-semibold text-[var(--text)]">{reaction.term.replaceAll("_", " ")}</td><td className="px-4 py-3 text-right font-bold text-[var(--signal-dark)]">{integer.format(reaction.countA)}</td><td className="px-4 py-3 text-right font-bold text-[#a95335]">{integer.format(reaction.countB)}</td></tr>)}</tbody></table></div>}
    </Panel>
  );
}

function UniqueReactions({ snapshot }: { snapshot: ComparisonPayload }) {
  const groups = [
    { drug: snapshot.drugA, reactions: snapshot.uniqueReactionsA, color: "text-[var(--signal-dark)]" },
    { drug: snapshot.drugB, reactions: snapshot.uniqueReactionsB, color: "text-[#a95335]" },
  ];
  return <div className="grid gap-6 lg:grid-cols-2">{groups.map(({ drug, reactions, color }) => <Panel key={drug.slug} className="p-6 sm:p-8"><Heading eyebrow="Distinct top terms" title={`Unique to ${drug.normalizedName}`} />{reactions.length === 0 ? <p className="rounded-xl bg-[var(--paper)] p-6 text-sm text-[var(--muted)]">No unique terms appear within this snapshot’s top reactions.</p> : <ol className="space-y-2">{reactions.slice(0, 10).map((reaction, index) => <li key={reaction.term} className="flex items-center justify-between gap-4 rounded-xl bg-[var(--paper)] px-4 py-3 text-sm"><span className="font-semibold text-[var(--text)]"><span className="mr-3 text-xs text-[var(--muted-light)]">{String(index + 1).padStart(2, "0")}</span>{reaction.term.replaceAll("_", " ")}</span><strong className={color}>{integer.format(reaction.count)}</strong></li>)}</ol>}</Panel>)}</div>;
}

function TrendChart({ snapshot }: { snapshot: ComparisonPayload }) {
  return (
    <Panel className="p-6 sm:p-8">
      <Heading eyebrow="Longitudinal view" title="Reports received by year" />
      {snapshot.yearlyTrend.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">No yearly trend data is available.</div> : <div className="h-[340px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={snapshot.yearlyTrend} margin={{ top: 8, right: 16, left: 0 }}><CartesianGrid vertical={false} stroke="#e8eeef" /><XAxis dataKey="year" axisLine={false} tickLine={false} minTickGap={24} /><YAxis axisLine={false} tickLine={false} width={50} tickFormatter={(value) => compact.format(value)} /><Tooltip formatter={(value) => integer.format(Number(value))} /><Legend /><Line type="monotone" dataKey="countA" name={snapshot.drugA.normalizedName} stroke="#0da691" strokeWidth={3} dot={false} activeDot={{ r: 5 }} /><Line type="monotone" dataKey="countB" name={snapshot.drugB.normalizedName} stroke="#d1764f" strokeWidth={3} dot={false} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div>}
    </Panel>
  );
}

function ComparisonLoading() {
  return <div className="flex min-h-96 items-center justify-center rounded-[1.8rem] border border-[var(--line)] bg-white"><div className="text-center"><LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[var(--signal-dark)]" /><p className="mt-4 text-sm font-semibold text-[var(--muted)]">Building both signal snapshots…</p></div></div>;
}

export function ComparisonWorkspace({ initialDrugA, initialDrugB }: { initialDrugA: string; initialDrugB: string }) {
  const [snapshot, setSnapshot] = useState<ComparisonPayload | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const hasComparison = Boolean(initialDrugA && initialDrugB);

  useEffect(() => {
    if (!hasComparison) return;
    const controller = new AbortController();
    fetch(`/api/compare?drugA=${encodeURIComponent(initialDrugA)}&drugB=${encodeURIComponent(initialDrugB)}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as ComparisonPayload | { error?: string };
        if (!response.ok) throw new Error("error" in body && body.error ? body.error : "The comparison could not be loaded.");
        return body as ComparisonPayload;
      })
      .then(setSnapshot)
      .catch((caught: unknown) => { if (caught instanceof Error && caught.name !== "AbortError") setError(caught.message); });
    return () => controller.abort();
  }, [attempt, hasComparison, initialDrugA, initialDrugB]);

  return (
    <main className="relative flex-1 overflow-hidden px-5 py-10 sm:py-14">
      <div className="page-grid pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-65" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center"><p className="eyebrow">Side-by-side signal explorer</p><h1 className="font-display mt-4 text-5xl leading-[0.92] tracking-[-0.04em] text-[var(--ink)] sm:text-7xl">Compare reported patterns, with context.</h1><p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">Explore how two aggregate FAERS snapshots differ and overlap without turning report counts into safety rankings.</p></div>
        <Panel className="mx-auto mt-9 max-w-5xl p-5 sm:p-7"><ComparisonForm initialDrugA={initialDrugA} initialDrugB={initialDrugB} /></Panel>

        <div className="mt-8">
          {!hasComparison ? <div className="mx-auto max-w-3xl rounded-[1.8rem] border border-dashed border-[var(--line)] bg-white/75 px-7 py-14 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--signal-pale)] text-[var(--signal-dark)]"><BarChart3 className="h-6 w-6" /></div><h2 className="font-display mt-6 text-3xl text-[var(--ink)]">Choose two drugs to begin.</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--muted)]">Try omeprazole and ibuprofen to see shared reactions, distinct top terms, seriousness share, and yearly reporting patterns.</p></div> : error ? <Panel className="mx-auto max-w-3xl p-8 text-center sm:p-12"><AlertTriangle className="mx-auto h-8 w-8 text-[var(--warning)]" /><p className="eyebrow mt-5">Comparison unavailable</p><h2 className="font-display mt-3 text-4xl text-[var(--ink)]">We couldn’t assemble these profiles.</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[var(--muted)]">{error}</p><Button className="mt-7" onClick={() => { setError(""); setSnapshot(null); setAttempt((value) => value + 1); }}><RefreshCw className="h-4 w-4" />Try again</Button></Panel> : !snapshot ? <ComparisonLoading /> : <div className="space-y-6"><div className="grid gap-6 lg:grid-cols-2"><DrugMetricCard drug={snapshot.drugA} label="Alphabetically first" tone="teal" /><DrugMetricCard drug={snapshot.drugB} label="Alphabetically second" tone="amber" /></div><div className="grid gap-6 lg:grid-cols-3"><SeriousShare snapshot={snapshot} /><OverlapTable snapshot={snapshot} /></div><UniqueReactions snapshot={snapshot} /><TrendChart snapshot={snapshot} /><AiSummaryCard endpoint={`/api/compare/summary?drugA=${encodeURIComponent(snapshot.drugA.normalizedName)}&drugB=${encodeURIComponent(snapshot.drugB.normalizedName)}`} /></div>}
        </div>

        <aside className="mt-6 flex gap-4 rounded-[1.4rem] border border-[var(--warning-line)] bg-[var(--warning-bg)] p-5 text-[var(--ink)]" aria-label="Important comparison limitation"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" /><div><p className="mb-1 text-xs font-bold tracking-[0.16em] text-[var(--warning)] uppercase">Do not interpret this as a safety ranking</p><p className="text-sm leading-6 sm:text-base">Raw FAERS report counts are not exposure-adjusted, do not establish causality, and do not prove that one drug is safer than another.</p></div></aside>
      </div>
    </main>
  );
}
