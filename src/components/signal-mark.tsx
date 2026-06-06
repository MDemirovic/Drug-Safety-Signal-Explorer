import { ShieldPlus } from "lucide-react";

export function SignalMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-xl bg-[var(--ink)] text-white shadow-sm ${
        compact ? "h-7 w-7" : "h-9 w-9"
      }`}
    >
      <ShieldPlus className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2.4} />
    </span>
  );
}
