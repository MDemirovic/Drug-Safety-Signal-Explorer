import { Menu } from "lucide-react";
import Link from "next/link";

import { SignalMark } from "@/components/signal-mark";

const navItems = [
  { href: "/compare", label: "Compare" },
  { href: "/methodology", label: "Methodology" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/92 backdrop-blur-xl">
      <div className="flex h-20 w-full items-center justify-between px-5 sm:px-8 lg:px-14">
        <Link
          href="/"
          className="flex items-center gap-3 text-[var(--ink)]"
          aria-label="Drug Safety Signal Explorer home"
        >
          <SignalMark />
          <span className="text-lg font-bold tracking-[-0.035em] sm:text-xl">
            Drug Safety Signal Explorer
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--signal-pale)] hover:text-[var(--ink)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/login"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:text-[var(--ink)]"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-[var(--ink)] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--ink-soft)]"
          >
            Create account
          </Link>
        </div>

        <Link
          href="/compare"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white/65 text-[var(--ink)] md:hidden"
          aria-label="Open comparison page"
        >
          <Menu className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
