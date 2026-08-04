import type { Metadata } from "next";
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  Database,
  FileSearch,
  Layers3,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How Drug Safety Signal Explorer searches, aggregates, caches, and responsibly presents public openFDA FAERS data.",
};

const principles = [
  {
    icon: FileSearch,
    number: "01",
    title: "A report is not proof",
    copy: "A matching report says that a medicine and an event were recorded in the same FAERS report. It does not establish that the medicine caused the event.",
  },
  {
    icon: Layers3,
    number: "02",
    title: "Counts are not rates",
    copy: "FAERS does not provide a reliable denominator for prescriptions or exposed patients. Report counts cannot estimate incidence or personal risk.",
  },
  {
    icon: ShieldCheck,
    number: "03",
    title: "Comparison is descriptive",
    copy: "Side-by-side views describe two separate reporting snapshots. They are not adjusted for exposure, population, indication, time on market, or reporting behavior.",
  },
  {
    icon: CalendarClock,
    number: "04",
    title: "Every view is a snapshot",
    copy: "Public source data can change as reports arrive or are updated. We date each aggregate and cache it for up to 30 days before rebuilding it.",
  },
];

const pipeline = [
  {
    step: "Search",
    text: "A name is cleaned and resolved through NIH RxNorm when possible, so a brand name can map to a canonical drug identity.",
  },
  {
    step: "Match",
    text: "The server searches openFDA event reports for that normalized name in generic-name, brand-name, or medicinal-product fields.",
  },
  {
    step: "Aggregate",
    text: "Only counts and ranked terms are assembled: total reports, seriousness classification, reported outcomes, yearly counts, and top reported terms.",
  },
  {
    step: "Contextualize",
    text: "Public FDA label sections are retrieved separately when available. Label text and FAERS report counts remain distinct evidence sources.",
  },
  {
    step: "Cache",
    text: "The aggregate snapshot is stored for 30 days. Raw patient-level FAERS records are not copied into this application.",
  },
];

const measures = [
  [
    "Total reports",
    "Reports matching the drug-name query.",
    "People exposed, prescriptions, or confirmed adverse reactions.",
  ],
  [
    "Top reported terms",
    "The most frequent reaction terms recorded anywhere in matching reports.",
    "A drug-to-event causal link or a list of real-world side-effect frequencies.",
  ],
  [
    "Serious share",
    "The portion of matching reports classified as serious in FAERS.",
    "The chance that an exposed patient will experience a serious event.",
  ],
  [
    "Yearly trend",
    "How many matching reports were received in each calendar year.",
    "A change in incidence; reporting volume and practices also change over time.",
  ],
  [
    "Comparison overlap",
    "Terms appearing in both drugs’ ranked aggregate snapshots.",
    "Evidence that the drugs have equal effects or comparable safety profiles.",
  ],
];

const sources = [
  {
    title: "openFDA Drug Event API",
    meta: "FAERS aggregate counts",
    href: "https://open.fda.gov/apis/drug/event/",
    copy: "Used for matching report totals, patient reaction-term counts, seriousness fields, and reports received by year.",
  },
  {
    title: "openFDA Drug Label API",
    meta: "Prescribing-information context",
    href: "https://open.fda.gov/apis/drug/label/",
    copy: "Used for selected public label sections when a matching label is available. Label text is not inferred from event reports.",
  },
  {
    title: "NIH RxNorm / RxNav",
    meta: "Drug-name normalization",
    href: "https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html",
    copy: "Used to resolve drug names and RxCUIs. If the service cannot resolve a name, the explorer falls back to a cleaned version of the search input.",
  },
  {
    title: "FDA adverse-event guidance",
    meta: "Interpretation and limitations",
    href: "https://www.fda.gov/media/165667/download",
    copy: "The FDA’s own guidance explains why spontaneous reports alone cannot establish causality, incidence, or comparative event rates.",
  },
];

export default function MethodologyPage() {
  return (
    <main className="relative flex-1 overflow-hidden px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-14">
      <div className="page-grid pointer-events-none absolute inset-x-0 top-0 h-[680px] opacity-70" />
      <div className="relative mx-auto max-w-7xl">
        <header className="grid gap-10 border-b border-[var(--line)] pb-14 lg:grid-cols-[1fr_0.66fr] lg:items-end lg:pb-20">
          <div className="reveal">
            <p className="eyebrow">Methodology &amp; sources</p>
            <h1 className="font-display mt-5 max-w-4xl text-5xl leading-[0.94] tracking-[-0.045em] text-[var(--ink)] sm:text-7xl lg:text-[5.4rem]">
              Read the signal.<br />Keep the limits in view.
            </h1>
          </div>
          <div className="reveal reveal-delay lg:pb-2">
            <p className="text-lg leading-8 text-[var(--muted)]">
              This explorer turns public spontaneous-report data into readable
              aggregate snapshots. It is built to support questions—not to
              deliver diagnoses, treatment advice, or safety rankings.
            </p>
            <Link
              href="#how-it-works"
              className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[var(--ink)] transition hover:text-[var(--signal-dark)]"
            >
              See how a snapshot is built <ArrowDown className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <section className="py-14 sm:py-20" aria-labelledby="reading-rules">
          <div className="mb-9 max-w-2xl">
            <p className="eyebrow">Four reading rules</p>
            <h2 id="reading-rules" className="font-display mt-3 text-4xl text-[var(--ink)] sm:text-5xl">
              What the numbers can—and cannot—say.
            </h2>
          </div>
          <div className="grid overflow-hidden rounded-[1.8rem] border border-[var(--line)] bg-white shadow-[0_24px_70px_rgba(16,53,58,0.07)] md:grid-cols-2">
            {principles.map(({ icon: Icon, number, title, copy }, index) => (
              <article
                key={number}
                className={`relative p-7 sm:p-9 ${index % 2 === 0 ? "md:border-r" : ""} ${index < 2 ? "border-b" : index === 2 ? "border-b md:border-b-0" : ""}`}
              >
                <div className="flex items-start justify-between gap-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--signal-pale)] text-[var(--signal-dark)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-display text-2xl text-[var(--line)]">{number}</span>
                </div>
                <h3 className="font-display mt-8 text-2xl text-[var(--ink)]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-28 border-y border-[var(--line)] py-14 sm:py-20" aria-labelledby="pipeline-title">
          <div className="grid gap-12 lg:grid-cols-[0.68fr_1fr]">
            <div>
              <p className="eyebrow">From query to chart</p>
              <h2 id="pipeline-title" className="font-display mt-3 text-4xl text-[var(--ink)] sm:text-5xl">
                One search,<br />five deliberate steps.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-[var(--muted)]">
                API keys, database access, and upstream requests remain on the
                server. The browser receives the finished aggregate—not raw case records.
              </p>
            </div>
            <ol className="divide-y divide-[var(--line)]">
              {pipeline.map((item, index) => (
                <li key={item.step} className="grid gap-3 py-6 first:pt-0 last:pb-0 sm:grid-cols-[3.5rem_8rem_1fr] sm:gap-5">
                  <span className="text-xs font-bold tracking-[0.16em] text-[var(--signal-dark)]">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="font-semibold text-[var(--ink)]">{item.step}</h3>
                  <p className="text-sm leading-6 text-[var(--muted)]">{item.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="terms" className="scroll-mt-28 py-14 sm:py-20" aria-labelledby="measures-title">
          <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="eyebrow">Measure by measure</p>
              <h2 id="measures-title" className="font-display mt-3 text-4xl text-[var(--ink)] sm:text-5xl">
                A precise reading guide.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[var(--muted)]">
              “Reported” always describes what appears in submitted records. It
              does not mean the event was verified or attributed to a medicine.
            </p>
          </div>
          <div className="overflow-x-auto rounded-[1.8rem] border border-[var(--line)] bg-white shadow-[0_20px_60px_rgba(16,53,58,0.06)]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[var(--paper-deep)] text-[0.68rem] tracking-[0.14em] text-[var(--muted)] uppercase">
                <tr>
                  <th className="px-6 py-4">Measure</th>
                  <th className="px-6 py-4">What it means here</th>
                  <th className="px-6 py-4">What it does not mean</th>
                </tr>
              </thead>
              <tbody>
                {measures.map(([measure, meaning, notMeaning]) => (
                  <tr key={measure} className="border-t border-[var(--line)] align-top">
                    <th className="px-6 py-5 font-bold text-[var(--ink)]">{measure}</th>
                    <td className="max-w-md px-6 py-5 leading-6 text-[var(--text)]">{meaning}</td>
                    <td className="max-w-md px-6 py-5 leading-6 text-[var(--muted)]">{notMeaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="data-source" className="scroll-mt-28 rounded-[2rem] bg-[var(--ink)] px-6 py-10 text-white sm:px-10 sm:py-14" aria-labelledby="sources-title">
          <div className="grid gap-10 lg:grid-cols-[0.62fr_1fr]">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-[var(--signal)]">
                <Database className="h-5 w-5" />
              </div>
              <p className="eyebrow mt-8 !text-[var(--signal)]">Primary sources</p>
              <h2 id="sources-title" className="font-display mt-3 text-4xl text-white sm:text-5xl">
                Public data,<br />visible provenance.
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/65">
                Each dashboard includes its calculation date and source window.
                Links here lead to the official documentation behind the explorer.
              </p>
            </div>
            <div className="divide-y divide-white/15 border-y border-white/15">
              {sources.map((source) => (
                <a
                  key={source.title}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group grid gap-2 py-6 sm:grid-cols-[1fr_1.3fr_auto] sm:items-start sm:gap-6"
                >
                  <div>
                    <h3 className="font-bold text-white transition group-hover:text-[var(--signal)]">{source.title}</h3>
                    <p className="mt-1 text-xs text-white/45">{source.meta}</p>
                  </div>
                  <p className="text-sm leading-6 text-white/65">{source.copy}</p>
                  <ArrowUpRight className="mt-1 h-4 w-4 text-[var(--signal)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-8 py-14 sm:py-20 lg:grid-cols-[1fr_0.72fr] lg:items-start" aria-labelledby="limitations-title">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--warning-bg)] text-[var(--warning)]">
              <TriangleAlert className="h-5 w-5" />
            </div>
            <p className="eyebrow mt-7 !text-[var(--warning)]">Known limitations</p>
            <h2 id="limitations-title" className="font-display mt-3 max-w-2xl text-4xl text-[var(--ink)] sm:text-5xl">
              Useful for signal exploration. Insufficient for a verdict.
            </h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-[var(--muted)]">
            <p>Reports may be incomplete, inaccurate, unverified, duplicated, or updated by follow-up submissions.</p>
            <p>A report may list several medicines, indications, outcomes, and reaction terms. openFDA report-level aggregates do not prove which listed medicine—if any—caused a listed event.</p>
            <p>Reporting is influenced by publicity, regulatory action, time on market, disease severity, and many other factors. Differences between drugs are not adjusted for those factors.</p>
            <p className="rounded-2xl border border-[var(--warning-line)] bg-[var(--warning-bg)] p-5 font-semibold text-[var(--ink)]">
              Do not stop or change a medicine based on this explorer. Discuss treatment questions with a qualified healthcare professional.
            </p>
          </div>
        </section>

        <div className="flex flex-col justify-between gap-5 border-t border-[var(--line)] pt-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
            <BookOpen className="h-4 w-4 text-[var(--signal-dark)]" />
            Last methodology review: August 2026
          </div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--ink)] transition hover:text-[var(--signal-dark)]">
            Return to drug search <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
