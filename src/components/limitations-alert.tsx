import { Info } from "lucide-react";

export function LimitationsAlert({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className="flex gap-4 rounded-[1.4rem] border border-[var(--warning-line)] bg-[var(--warning-bg)] p-5 text-[var(--ink)]"
      aria-label="Important FAERS limitation"
    >
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" />
      <div>
        <p className="mb-1 text-xs font-bold tracking-[0.16em] text-[var(--warning)] uppercase">
          Important limitation
        </p>
        <p className={compact ? "text-sm leading-6" : "text-sm leading-6 sm:text-base"}>
          FAERS reports are spontaneous adverse event reports. They do not
          prove that a drug caused an event and cannot be used to estimate
          real-world incidence or personal risk.
        </p>
      </div>
    </aside>
  );
}
