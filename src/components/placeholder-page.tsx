import { ArrowUpRight, Construction, LockKeyhole } from "lucide-react";
import Link from "next/link";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  privatePreview?: boolean;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  status = "Planned for a later phase",
  privatePreview = false,
}: PlaceholderPageProps) {
  const Icon = privatePreview ? LockKeyhole : Construction;

  return (
    <main className="relative flex-1 overflow-hidden">
      <div className="page-grid absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-5xl px-5 py-18 sm:px-8 sm:py-24">
        <div className="reveal rounded-[2rem] border border-[var(--line)] bg-white/74 p-7 shadow-[0_30px_100px_rgba(28,53,54,0.09)] backdrop-blur sm:p-12">
          <div className="mb-10 flex items-start justify-between gap-6">
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.02] tracking-[-0.04em] text-[var(--ink)] sm:text-6xl">
                {title}
              </h1>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper-deep)] text-[var(--signal-dark)]">
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
            {description}
          </p>

          <div className="my-10 h-px bg-[var(--line)]" />

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="w-fit rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-xs font-bold tracking-[0.14em] text-[var(--muted)] uppercase">
              {status}
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--ink)] hover:text-[var(--signal-dark)]"
            >
              Return to drug search
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
