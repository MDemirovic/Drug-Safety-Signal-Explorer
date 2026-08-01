import { LoaderCircle } from "lucide-react";

export default function CompareLoading() {
  return (
    <main className="flex min-h-[60vh] flex-1 items-center justify-center px-5">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[var(--signal-dark)]" />
        <p className="mt-4 text-sm font-semibold text-[var(--muted)]">Opening the comparison workspace…</p>
      </div>
    </main>
  );
}
