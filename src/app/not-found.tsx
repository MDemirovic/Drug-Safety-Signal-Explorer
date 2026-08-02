import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-[68vh] flex-1 items-center overflow-hidden px-5 py-16">
      <div className="page-grid pointer-events-none absolute inset-0 opacity-60" />
      <section className="reveal relative mx-auto w-full max-w-4xl rounded-[2rem] border border-[var(--line)] bg-white/90 p-8 shadow-[0_30px_90px_rgba(16,53,58,0.08)] sm:p-12">
        <SearchX className="h-10 w-10 text-[var(--signal-dark)]" />
        <p className="eyebrow mt-8">404 · No matching route</p>
        <h1 className="font-display mt-4 max-w-2xl text-5xl leading-none text-[var(--ink)] sm:text-7xl">This signal trail ends here.</h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)]">The page may have moved, or the requested snapshot is no longer available.</p>
        <Link href="/" className="mt-9 inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white">
          <ArrowLeft className="h-4 w-4" /> Return to explorer
        </Link>
      </section>
    </main>
  );
}
