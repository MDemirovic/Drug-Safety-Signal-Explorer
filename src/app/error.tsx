"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Application route failed.", error);
  }, [error]);

  return (
    <main className="relative flex min-h-[68vh] flex-1 items-center overflow-hidden px-5 py-16">
      <div className="page-grid pointer-events-none absolute inset-0 opacity-60" />
      <section className="relative mx-auto w-full max-w-4xl rounded-[2rem] border border-[var(--warning-line)] bg-white p-8 shadow-[0_30px_90px_rgba(16,53,58,0.08)] sm:p-12">
        <TriangleAlert className="h-10 w-10 text-[var(--warning)]" />
        <p className="eyebrow mt-8">Recoverable interruption</p>
        <h1 className="font-display mt-4 max-w-2xl text-5xl leading-none text-[var(--ink)] sm:text-7xl">The analysis paused unexpectedly.</h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)]">No secret or report details are shown here. Retry the request, or return to a fresh search.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white">
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
          <Link href="/" className="rounded-full border border-[var(--line)] px-5 py-3 text-sm font-bold text-[var(--ink)]">Return home</Link>
        </div>
      </section>
    </main>
  );
}
