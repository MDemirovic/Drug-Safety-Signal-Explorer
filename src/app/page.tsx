import { List, Shield, Sparkles } from "lucide-react";

import { DrugSearchForm } from "@/components/drug-search-form";

function ExampleDashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-[-0.04em]">Omeprazole</h2>
      <p className="mt-1 text-sm text-[var(--text)]">Example overview</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-[0.8fr_1.4fr]">
        <div className="rounded-xl border border-[var(--line)] p-4">
          <p className="text-xs font-bold text-[var(--text)]">Total FAERS reports</p>
          <p className="mt-3 text-2xl font-bold tracking-[-0.04em]">24,857</p>
          <div className="mt-4 flex h-11 items-end gap-1.5" aria-hidden="true">
            {[36, 28, 44, 38, 55, 72, 46, 67].map((height, index) => (
              <span
                key={`${height}-${index}`}
                className="flex-1 rounded-t-sm bg-gradient-to-t from-[#b8e9e1] to-[#73d4c5]"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6 rounded-xl border border-[var(--line)] p-4">
          <div>
            <p className="text-xs font-bold text-[var(--text)]">
              Serious vs non-serious
            </p>
            <div className="mt-3 h-20 w-20 rounded-full bg-[conic-gradient(var(--signal-dark)_0_28%,#c7e8e2_28%_100%)] p-3">
              <div className="h-full w-full rounded-full bg-white" />
            </div>
          </div>
          <div className="pt-5">
            <p className="text-2xl font-bold tracking-[-0.04em]">28%</p>
            <p className="mt-1 text-xs font-bold text-[var(--text)]">Serious</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[var(--line)] p-4">
        <p className="text-xs font-bold text-[var(--text)]">Reports over time</p>
        <svg
          className="mt-3 h-16 w-full overflow-visible"
          viewBox="0 0 560 70"
          role="img"
          aria-label="Example reports over time line chart"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="line-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#45c9b5" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#45c9b5" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <path
            d="M0 55 L28 42 L52 50 L82 55 L110 24 L142 44 L172 39 L202 25 L224 43 L250 17 L278 39 L306 31 L334 34 L362 42 L389 25 L420 22 L446 45 L474 31 L506 27 L542 6 L560 18 L560 70 L0 70 Z"
            fill="url(#line-fill)"
          />
          <path
            d="M0 55 L28 42 L52 50 L82 55 L110 24 L142 44 L172 39 L202 25 L224 43 L250 17 L278 39 L306 31 L334 34 L362 42 L389 25 L420 22 L446 45 L474 31 L506 27 L542 6 L560 18"
            fill="none"
            stroke="#14a493"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}

const features = [
  {
    icon: List,
    title: "Top reported reactions",
    text: "View the most frequently reported reactions.",
  },
  {
    icon: Shield,
    title: "FDA safety information",
    text: "Access FDA labels and safety communications.",
  },
  {
    icon: Sparkles,
    title: "AI summary",
    text: "Get a concise summary of key signals and context.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-white">
      <section className="grid w-full flex-[1.2] content-center gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-14 lg:py-12 xl:px-20">
        <div className="reveal">
          <h1 className="max-w-2xl text-5xl leading-[1.05] font-bold tracking-[-0.055em] text-[var(--ink)] sm:text-6xl lg:text-7xl">
            Explore drug safety signals clearly.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--text)]">
            A public dashboard for exploring reported FAERS/openFDA adverse
            event data.
          </p>
          <div className="mt-7 max-w-2xl">
            <DrugSearchForm />
          </div>
        </div>

        <div className="reveal reveal-delay">
          <ExampleDashboard />
        </div>
      </section>

      <section className="flex w-full flex-1 flex-col justify-center px-5 py-10 sm:px-8 lg:px-14 lg:py-12 xl:px-20">
        <h2 className="text-center text-2xl font-bold tracking-[-0.04em] text-[var(--ink)]">
          What you can explore
        </h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3 lg:gap-12">
          {features.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="flex min-h-40 items-center justify-center gap-7 px-5 py-8"
            >
              <Icon
                className="h-16 w-16 shrink-0 text-[var(--signal-dark)]"
                strokeWidth={1.7}
              />
              <div>
                <h3 className="text-xl font-bold tracking-[-0.025em]">{title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[var(--text)]">
                  {text}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
