import { Activity } from "lucide-react";

export function PageLoading({ label = "Preparing signal workspace" }: { label?: string }) {
  return (
    <main className="relative flex min-h-[64vh] flex-1 items-center overflow-hidden px-5 py-16">
      <div className="page-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mx-auto w-full max-w-4xl" role="status" aria-live="polite">
        <div className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white/90 p-7 shadow-[0_30px_90px_rgba(16,53,58,0.08)] sm:p-11">
          <div className="flex items-center gap-3 text-[var(--signal-dark)]">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--signal-pale)]">
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--signal)]/20" />
              <Activity className="relative h-5 w-5" />
            </span>
            <p className="eyebrow">Live aggregate analysis</p>
          </div>
          <p className="font-display mt-8 text-4xl text-[var(--ink)] sm:text-5xl">{label}…</p>
          <div className="mt-9 space-y-3" aria-hidden="true">
            <div className="h-3 w-full animate-pulse rounded-full bg-[var(--paper-deep)]" />
            <div className="h-3 w-4/5 animate-pulse rounded-full bg-[var(--paper-deep)] [animation-delay:120ms]" />
            <div className="h-3 w-3/5 animate-pulse rounded-full bg-[var(--signal-pale)] [animation-delay:240ms]" />
          </div>
          <p className="mt-7 text-sm text-[var(--muted)]">Cached results appear immediately; new aggregates can take a moment.</p>
        </div>
        <span className="sr-only">Loading</span>
      </div>
    </main>
  );
}
