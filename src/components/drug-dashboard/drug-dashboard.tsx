"use client";

import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarRange,
  ChevronDown,
  FileText,
  FlaskConical,
  HeartPulse,
  LoaderCircle,
  RefreshCw,
  Route,
  ShieldAlert,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

import { AiSummaryCard } from "@/components/ai/ai-summary-card";
import { LimitationsAlert } from "@/components/limitations-alert";
import { SaveReportButton } from "@/components/saved-reports/save-report-button";
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

function EvidenceInterpretationNotice({
  drugName,
}: {
  drugName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function closePanel() {
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <button
        type="button"
        tabIndex={isOpen ? 0 : -1}
        aria-hidden={!isOpen}
        aria-label="Close guidance about interpreting FAERS reports"
        onClick={closePanel}
        className={`fixed inset-0 z-40 bg-[#082f2d]/12 backdrop-blur-[1px] transition-opacity duration-300 ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="evidence-interpretation-panel"
        aria-label={isOpen ? "Close evidence guidance" : "Open evidence guidance"}
        onClick={() => setIsOpen((current) => !current)}
        className={`group fixed top-28 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-[#8b4b00] bg-[#b96b0d] text-white shadow-[0_16px_42px_rgba(151,79,0,0.36)] ring-4 ring-[#f8dfad]/80 transition-all duration-300 hover:scale-105 hover:bg-[#9d5706] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#8b4b00] sm:top-40 ${
          isOpen ? "sm:right-[30rem]" : "sm:right-5"
        }`}
      >
        <span className="absolute inset-1 rounded-full border border-white/35" />
        <AlertTriangle className="relative h-5.5 w-5.5 stroke-[2.4]" aria-hidden="true" />
        {!isOpen && (
          <span className="pointer-events-none absolute top-1/2 right-full mr-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-[var(--ink)] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
            How to read this data
          </span>
        )}
      </button>

      <aside
        id="evidence-interpretation-panel"
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen ? "true" : undefined}
        aria-hidden={!isOpen}
        aria-labelledby="evidence-interpretation-title"
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            event.preventDefault();
            closeButtonRef.current?.focus();
          }
        }}
        className={`fixed right-3 bottom-3 left-3 z-50 max-h-[76vh] overflow-y-auto overscroll-contain rounded-[1.75rem] border border-[#e5bb72] bg-[#fff9ec] shadow-[0_28px_90px_rgba(22,47,45,0.3)] transition-[transform,opacity] duration-300 ease-out sm:top-6 sm:right-5 sm:bottom-6 sm:left-auto sm:max-h-none sm:w-[28rem] ${
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100 sm:translate-x-0"
            : "pointer-events-none translate-y-[calc(100%+2rem)] opacity-0 sm:translate-x-[calc(100%+2rem)] sm:translate-y-0"
        }`}
      >
        <div className="relative min-h-full overflow-hidden px-6 py-6 sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute -top-16 -right-12 h-52 w-52 rounded-full bg-[#f2d49a]/40 blur-3xl" />
          <div className="relative flex items-start justify-between gap-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#e8c783] bg-white text-[#9a5b08] shadow-sm">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closePanel}
              tabIndex={isOpen ? 0 : -1}
              aria-label="Close evidence guidance"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e4cda1] bg-white/80 text-[#6f5a39] transition-colors hover:bg-white hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b56a09]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="relative mt-7">
            <p className="text-[0.67rem] font-bold tracking-[0.17em] text-[#9a5b08] uppercase">
              Read before interpreting these numbers
            </p>
            <h2
              id="evidence-interpretation-title"
              className="font-display mt-3 text-[2rem] leading-[1.05] text-[var(--ink)] sm:text-[2.35rem]"
            >
              A mention is not proof that {drugName} caused the event.
            </h2>
            <p className="mt-5 text-sm leading-7 text-[#604c30]">
              A FAERS report may list several medicines and several outcomes. {drugName} and a term such as death, hospitalization, or kidney disease may only appear in the same record; the public data does not connect an individual medicine to an individual outcome or establish causation.
            </p>

            <div className="mt-6 space-y-5 border-t border-[#ead6ad] pt-6 text-sm leading-6 text-[#6f5a39]">
              <div>
                <p className="font-bold text-[#4e3a1e]">Report-level classification</p>
                <p className="mt-1">“Serious” and “death” describe the matching report, not a proven effect of this drug.</p>
              </div>
              <div>
                <p className="font-bold text-[#4e3a1e]">No successful-use count</p>
                <p className="mt-1">FAERS does not record the millions of uses that may occur without a reported problem.</p>
              </div>
              <div>
                <p className="font-bold text-[#4e3a1e]">No risk estimate</p>
                <p className="mt-1">These counts cannot measure incidence, personal risk, or how safe one medicine is compared with another.</p>
              </div>
            </div>

            <p className="mt-7 rounded-2xl border border-[#ead6ad] bg-white/65 px-4 py-3 text-xs leading-5 text-[#705b3d]">
              Use this profile to explore reporting patterns only—not to make treatment or medication decisions.
            </p>
          </div>
        </div>
      </aside>
    </>
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
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--ink)] px-3 py-1 text-[0.67rem] font-bold tracking-[0.16em] text-white uppercase">
                FAERS signal profile
              </span>
              <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                {snapshot.cacheStatus === "hit" ? "Cached snapshot" : "Fresh snapshot"}
              </span>
            </div>
            <SaveReportButton key={snapshot.slug} slug={snapshot.slug} />
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
      <PanelHeading eyebrow="Co-reported terms" title="Terms found in matching records" />
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
      <PanelHeading eyebrow="Ranked list" title="Co-reported term detail" />
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
      <PanelHeading eyebrow="Case classification" title="Report-level seriousness" />
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
      <PanelHeading eyebrow="Report fields" title="Report-level outcome breakdown" />
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
      <PanelHeading eyebrow="Longitudinal view" title="Matching reports received by year" />
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

function ExpandableLabelText({
  sectionTitle,
  value,
}: {
  sectionTitle: string;
  value: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = value.length > 420;

  return (
    <div className="overflow-hidden rounded-xl border border-transparent bg-[var(--paper)] transition-colors focus-within:border-[var(--signal)]/40">
      <div
        className={`px-4 pt-4 text-sm leading-6 text-[var(--text)] ${
          isLong && !expanded ? "line-clamp-5" : ""
        } ${expanded ? "max-h-[28rem] overflow-y-auto overscroll-contain pr-3 pb-4" : "pb-4"}`}
        tabIndex={expanded ? 0 : undefined}
      >
        {value}
      </div>
      {isLong && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="flex w-full items-center justify-between border-t border-[var(--line)] bg-white/70 px-4 py-3 text-xs font-bold tracking-[0.04em] text-[var(--signal-dark)] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--signal-dark)]"
        >
          <span>
            {expanded
              ? `Collapse ${sectionTitle.toLowerCase()} section`
              : `Show full ${sectionTitle.toLowerCase()} section`}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}

function LabelList({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold tracking-[0.13em] text-[var(--muted)] uppercase">{title}</h3>
      <div className="space-y-2 text-sm leading-6 text-[var(--text)]">
        {values.map((value, index) => (
          <ExpandableLabelText
            key={`${title}-${index}`}
            sectionTitle={title}
            value={value}
          />
        ))}
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
      <EvidenceInterpretationNotice key={snapshot.slug} drugName={snapshot.normalizedName} />
      <div className="relative mx-auto max-w-7xl space-y-6">
        <div className="reveal"><DrugHeaderCard snapshot={snapshot} /></div>
        <div className="reveal reveal-delay grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={FileText} label="Reports mentioning drug" value={snapshot.totalReports} note="FAERS records where this drug appears somewhere in the medicine list." />
          <MetricCard icon={ShieldAlert} label="Matching reports — serious" value={snapshot.seriousReports} note="Report-level classification; it does not attribute the outcome to this drug." tone="amber" />
          <MetricCard icon={HeartPulse} label="Matching reports — non-serious" value={snapshot.nonSeriousReports} note="Report-level classification, not a confirmed reaction caused by this drug." />
          <MetricCard icon={CalendarRange} label="Years covered" value={Math.max(snapshot.sourceMeta.toYear - snapshot.sourceMeta.fromYear + 1, 0)} note="Calendar years included in the trend aggregation." tone="slate" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3"><TopReactionsChart snapshot={snapshot} /><TopReactionsTable snapshot={snapshot} /></div>
        <div className="grid gap-6 lg:grid-cols-2"><SeriousnessPieChart snapshot={snapshot} /><SeriousnessBreakdownCard snapshot={snapshot} /></div>
        <div className="grid gap-6 lg:grid-cols-2"><YearlyTrendChart snapshot={snapshot} /><LabelSummaryCard snapshot={snapshot} /></div>
        <AiSummaryCard key={snapshot.slug} endpoint={`/api/drugs/${encodeURIComponent(snapshot.slug)}/summary`} />
        <LimitationsAlert />
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-4 text-xs text-[var(--muted)]"><span>Sources: {snapshot.sourceMeta.eventSource} · {snapshot.sourceMeta.labelSource}</span><span>Aggregate-only snapshot · expires {new Date(snapshot.expiresAt).toLocaleDateString()}</span></div>
      </div>
    </main>
  );
}
