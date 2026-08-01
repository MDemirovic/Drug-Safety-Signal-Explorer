import { LoaderCircle } from "lucide-react";

export default function DrugPageLoading() {
  return (
    <main className="flex min-h-[62vh] flex-1 items-center justify-center px-5">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[var(--signal-dark)]" />
        <p className="mt-4 text-sm font-semibold text-[var(--muted)]">
          Opening the signal dashboard…
        </p>
      </div>
    </main>
  );
}
