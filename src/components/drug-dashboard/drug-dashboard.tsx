"use client";

import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarRange,
  FileText,
  FlaskConical,
  HeartPulse,
  LoaderCircle,
  RefreshCw,
  Route,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { LimitationsAlert } from "@/components/limitations-alert";
import { Button } from "@/components/ui/button";
import type { DrugSnapshotResult } from "@/types/drug-snapshot";

type DrugSnapshotPayload = Omit<
  DrugSnapshotResult,
  "computedAt" | "expiresAt"
> & {
  computedAt: string;
  expiresAt: string;
};

const integer = new Intl.NumberFormat("en-US");
const compactInteger = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[1.6rem] border border-[var(--line)] bg-white shadow-[0_18px_55px_rgba(16,53,58,0.07)] ${className}`}
    >
      {children}
    </section>
  );
}

function PanelHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h2 className="font-display text-2xl leading-none text-[var(--ink)] sm:text-[1.7rem]">
        {title}
      </h2>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--paper)] px-6 text-center text-sm leading-6 text-[var(--muted)]">
      {children}
    </div>
  );
}

export function DrugHeaderCard({ snapshot }: { snapshot: DrugSnapshotPayload }) {
  const label = snapshot.label;
  const names = Array.from(
    new Set([...(label?.brandNames ?? []), ...(label?.genericNames ?? [])]),
  ).slice(0, 5);

  return (
    <Panel className="relative overflow-hidden p-7 sm:p-9">
      <div className="pointer-events-none absolute -top-24 -right-16 h-60 w-60 rounded-full bg-[var(--signal-pale)] blur-2xl" />
      <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--ink)] px-3 py-1 text-[0.67rem] font-bold tracking-[0.16em] text-white uppercase">
              FAERS signal profile
            </span>
            <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)]">
              {snapshot.cacheStatus === "hit" ? "Cached snapshot" : "Fresh snapshot"}
            </span>
          </div>
          <h1 className="font-display max-w-4xl text-5xl leading-[0.92] tracking-[-0.04em] text-[var(--ink)] capitalize sm:text-7xl">
            {snapshot.normalizedName}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--muted)]">
            A structured view of reported adverse-event patterns—not a measure of
            causality, incidence, or personal risk.
          </p>
          {names.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {names.map((name) => (
                <span
                  key={name}
                  className="rounded-lg bg-[var(--paper-deep)] px-3 py-1.5 text-xs font-semibold text-[var(--text)]"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
        <dl className="grid min-w-56 grid-cols-2 gap-x-6 gap-y-4 border-t border-[var(--line)] pt-5 text-sm lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <div>
            <dt className="text-[var(--muted)]">RxCUI</dt>
            <dd className="mt-1 font-bold text-[var(--ink)]">{snapshot.rxcui ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Updated</dt>
            <dd className="mt-1 font-bold text-[var(--ink)]">
              {new Date(snapshot.computedAt).toLocaleDateString()}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[var(--muted)]">Evidence window</dt>
            <dd className="mt-1 font-bold text-[var(--ink)]">
              {snapshot.sourceMeta.fromYear}–{snapshot.sourceMeta.toYear}
            </dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  tone = "teal",
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  note: string;
  tone?: "teal" | "amber" | "slate";
}) {
  const tones = {
    teal: "bg-[var(--signal-pale)] text-[var(--signal-dark)]",
    amber: "bg-[var(--warning-bg)] text-[var(--warning)]",
    slate: "bg-[#eef1f6] text-[var(--text)]",
  };

  return (
    <Panel className="p-5 sm:p-6">
      <div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-bold tracking-[0.14em] text-[var(--muted)] uppercase">{label}</p>
      <p className="mt-2 font-display text-4xl leading-none text-[var(--ink)]">
        {compactInteger.format(value)}
      </p>
      <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{note}</p>
    </Panel>
  );
}

export function TopReactionsChart({ snapshot }: { snapshot: DrugSnapshotPayload }) {
  const data = snapshot.topReactions.slice(0, 10).map((item) => ({
    ...item,
    label: item.term.replaceAll("_", " "),
  }));

  return (
    <Panel className="p-6 sm:p-8 lg:col-span-2">
      <PanelHeading eyebrow="Reported terms" title="Most frequently reported reactions" />
      {data.length === 0 ? (
        <EmptyState>No reaction aggregates were returned for this drug.</EmptyState>
      ) : (
        <div className="h-[390px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 6, right: 22 }}>
              <CartesianGrid horizontal={false} stroke="#e8eeef" />
              <XAxis type="number" tickFormatter={(value) => compactInteger.format(value)} axisLine={false} tickLine={false} />
              <YAxis dataKey="label" type="category" width={118} axisLine={false} tickLine={false} tick={{ fill: "#263653", fontSize: 11 }} />
              <Tooltip formatter={(value) => integer.format(Number(value))} cursor={{ fill: "#f2f7f6" }} />
              <Bar dataKey="count" fill="#0da691" radius={[0, 7, 7, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

export function TopReactionsTable({ snapshot }: { snapshot: DrugSnapshotPayload }) {
  return (
    <Panel className="overflow-hidden p-6 sm:p-8">
      <PanelHeading eyebrow="Ranked list" title="Reaction detail" />
      {snapshot.topReactions.length === 0 ? (
        <EmptyState>No reaction terms are available.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--line)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--paper-deep)] text-[0.67rem] tracking-[0.14em] text-[var(--muted)] uppercase">
              <tr><th className="px-4 py-3">Reaction</th><th className="px-4 py-3 text-right">Reports</th></tr>
            </thead>
            <tbody>
              {snapshot.topReactions.slice(0, 10).map((item, index) => (
                <tr key={item.term} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-semibold text-[var(--text)]"><span className="mr-3 text-xs text-[var(--muted-light)]">{String(index + 1).padStart(2, "0")}</span>{item.term.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 text-right font-bold text-[var(--ink)]">{integer.format(item.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

const seriousnessColors = ["#0da691", "#d39a42", "#a8b3c2"];

export function SeriousnessPieChart({ snapshot }: { snapshot: DrugSnapshotPayload }) {
  const data = [
    { name: "Serious", value: snapshot.seriousReports },
    { name: "Non-serious", value: snapshot.nonSeriousReports },
    { name: "Unknown", value: snapshot.unknownSeriousnessReports },
  ].filter((item) => item.value > 0);

  return (
    <Panel className="p-6 sm:p-8">
      <PanelHeading eyebrow="Case classification" title="Reported seriousness" />
      {data.length === 0 ? (
        <EmptyState>No seriousness classification was returned.</EmptyState>
      ) : (
        <>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} stroke="none">
                  {data.map((item, index) => <Cell key={item.name} fill={seriousnessColors[index]} />)}
                </Pie>
                <Tooltip formatter={(value) => integer.format(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-[var(--muted)]"><span className="h-2.5 w-2.5 rounded-full" style={{ background: seriousnessColors[index] }} />{item.name}</span>
                <strong className="text-[var(--ink)]">{integer.format(item.value)}</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

export function SeriousnessBreakdownCard({ snapshot }: { snapshot: DrugSnapshotPayload }) {
  const breakdown = [
    ["Hospitalization", snapshot.seriousnessBreakdown.hospitalization],
    ["Death", snapshot.seriousnessBreakdown.death],
    ["Life-threatening", snapshot.seriousnessBreakdown.lifeThreatening],
    ["Disability", snapshot.seriousnessBreakdown.disability],
    ["Congenital anomaly", snapshot.seriousnessBreakdown.congenitalAnomaly],
    ["Other serious", snapshot.seriousnessBreakdown.otherSerious],
  ] as const;
  const maximum = Math.max(...breakdown.map(([, value]) => value), 1);

  return (
    <Panel className="p-6 sm:p-8">
      <PanelHeading eyebrow="Serious outcomes" title="Outcome breakdown" />
      <div className="space-y-4">
        {breakdown.map(([label, value]) => (
          <div key={label}>
            <div className="mb-1.5 flex justify-between text-sm"><span className="text-[var(--muted)]">{label}</span><strong className="text-[var(--ink)]">{integer.format(value)}</strong></div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--paper-deep)]"><div className="h-full rounded-full bg-[var(--signal-dark)]" style={{ width: `${Math.max((value / maximum) * 100, value ? 2 : 0)}%` }} /></div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function YearlyTrendChart({ snapshot }: { snapshot: DrugSnapshotPayload }) {
  return (
    <Panel className="p-6 sm:p-8 lg:col-span-2">
      <PanelHeading eyebrow="Longitudinal view" title="Reports received by year" />
      {snapshot.yearlyTrend.length === 0 ? (
        <EmptyState>No yearly trend data is available.</EmptyState>
      ) : (
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={snapshot.yearlyTrend} margin={{ left: 0, right: 14, top: 10 }}>
              <CartesianGrid vertical={false} stroke="#e8eeef" />
              <XAxis dataKey="year" axisLine={false} tickLine={false} minTickGap={24} tick={{ fill: "#68758a", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} width={48} tickFormatter={(value) => compactInteger.format(value)} tick={{ fill: "#68758a", fontSize: 11 }} />
              <Tooltip formatter={(value) => integer.format(Number(value))} />
              <Line type="monotone" dataKey="count" stroke="#0da691" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#064b47" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

function LabelList({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold tracking-[0.13em] text-[var(--muted)] uppercase">{title}</h3>
      <div className="space-y-2 text-sm leading-6 text-[var(--text)]">
        {values.slice(0, 2).map((value) => <p key={value} className="line-clamp-5 rounded-xl bg-[var(--paper)] p-4">{value}</p>)}
      </div>
    </div>
  );
}

export function LabelSummaryCard({ snapshot }: { snapshot: DrugSnapshotPayload }) {
  const label = snapshot.label;
  return (
    <Panel className="p-6 sm:p-8 lg:col-span-2">
      <PanelHeading eyebrow="FDA labeling context" title="Label summary" />
      {!label ? (
        <EmptyState>No matching FDA label was available. The FAERS aggregates above remain usable.</EmptyState>
      ) : (
        <div className="grid gap-7 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {[{ icon: Building2, label: "Manufacturer", value: label.manufacturerNames[0] }, { icon: Route, label: "Route", value: label.routes[0] }, { icon: FlaskConical, label: "Product", value: label.productTypes[0] }].map(({ icon: Icon, label: itemLabel, value }) => (
                <div key={itemLabel} className="rounded-xl border border-[var(--line)] p-4"><Icon className="mb-3 h-4 w-4 text-[var(--signal-dark)]" /><p className="text-[0.65rem] font-bold tracking-[0.12em] text-[var(--muted)] uppercase">{itemLabel}</p><p className="mt-1 text-sm font-semibold text-[var(--text)]">{value ?? "Not listed"}</p></div>
              ))}
            </div>
            <LabelList title="Indications and usage" values={label.indicationsAndUsage} />
          </div>
          <div className="space-y-6">
            <LabelList title="Boxed warning" values={label.boxedWarning} />
            <LabelList title="Warnings" values={label.warnings} />
            <LabelList title="Adverse reactions" values={label.adverseReactions} />
          </div>
        </div>
      )}
    </Panel>
  );
}

function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center"><LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[var(--signal-dark)]" /><p className="mt-4 text-sm font-semibold text-[var(--muted)]">Assembling the signal snapshot…</p></div>
    </div>
  );
}

export function DrugDashboard({ slug }: { slug: string }) {
  const [snapshot, setSnapshot] = useState<DrugSnapshotPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/drugs/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as
          | DrugSnapshotPayload
          | { error?: string };
        if (!response.ok) {
          throw new Error(
            "error" in body && body.error
              ? body.error
              : "The signal snapshot could not be loaded.",
          );
        }
        return body as DrugSnapshotPayload;
      })
      .then(setSnapshot)
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name !== "AbortError") {
          setError(caught.message);
        }
      });
    return () => controller.abort();
  }, [attempt, slug]);

  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center px-5 py-20">
        <Panel className="w-full p-8 text-center sm:p-12"><AlertTriangle className="mx-auto h-8 w-8 text-[var(--warning)]" /><p className="eyebrow mt-5">Snapshot unavailable</p><h1 className="font-display mt-3 text-4xl text-[var(--ink)]">We couldn’t assemble this drug profile.</h1><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[var(--muted)]">{error}</p><Button className="mt-7" onClick={() => { setError(null); setSnapshot(null); setAttempt((value) => value + 1); }}><RefreshCw className="h-4 w-4" />Try again</Button></Panel>
      </main>
    );
  }
  if (!snapshot) return <DashboardLoading />;

  return (
    <main className="relative flex-1 overflow-hidden px-5 py-10 sm:py-14">
      <div className="page-grid pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-60" />
      <div className="relative mx-auto max-w-7xl space-y-6">
        <div className="reveal"><DrugHeaderCard snapshot={snapshot} /></div>
        <div className="reveal reveal-delay grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={FileText} label="Total reports" value={snapshot.totalReports} note="Reports matching the drug search across the evidence window." />
          <MetricCard icon={ShieldAlert} label="Serious reports" value={snapshot.seriousReports} note="Reports marked serious in the source record." tone="amber" />
          <MetricCard icon={HeartPulse} label="Non-serious" value={snapshot.nonSeriousReports} note="Reports not marked serious in the source record." />
          <MetricCard icon={CalendarRange} label="Years covered" value={Math.max(snapshot.sourceMeta.toYear - snapshot.sourceMeta.fromYear + 1, 0)} note="Calendar years included in the trend aggregation." tone="slate" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3"><TopReactionsChart snapshot={snapshot} /><TopReactionsTable snapshot={snapshot} /></div>
        <div className="grid gap-6 lg:grid-cols-2"><SeriousnessPieChart snapshot={snapshot} /><SeriousnessBreakdownCard snapshot={snapshot} /></div>
        <div className="grid gap-6 lg:grid-cols-2"><YearlyTrendChart snapshot={snapshot} /><LabelSummaryCard snapshot={snapshot} /></div>
        <LimitationsAlert />
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-4 text-xs text-[var(--muted)]"><span>Sources: {snapshot.sourceMeta.eventSource} · {snapshot.sourceMeta.labelSource}</span><span>Aggregate-only snapshot · expires {new Date(snapshot.expiresAt).toLocaleDateString()}</span></div>
      </div>
    </main>
  );
}
