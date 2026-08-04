import { Info } from "lucide-react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-white px-5 sm:px-8 lg:px-14 xl:px-20">
      <div className="grid min-h-20 w-full gap-5 border-t border-[var(--line)] py-4 text-[11px] text-[var(--muted)] sm:text-xs lg:grid-cols-3 lg:items-center">
        <div className="flex items-center gap-2.5 lg:justify-self-start">
          <Info className="h-4 w-4 shrink-0" />
          <p className="max-w-[34rem]">
            FAERS reports do not prove that a drug caused a reaction and cannot
            estimate real-world incidence or personal risk.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 font-semibold lg:justify-self-center">
          <Link href="/methodology" className="hover:text-[var(--ink)]">
            Methodology
          </Link>
          <span aria-hidden="true">&middot;</span>
          <Link href="/methodology#data-source" className="hover:text-[var(--ink)]">
            Data source
          </Link>
          <span aria-hidden="true">&middot;</span>
          <Link href="/methodology#terms" className="hover:text-[var(--ink)]">
            Terms
          </Link>
        </div>
        <p className="lg:justify-self-end lg:text-right">
          &copy; 2026 Drug Safety Signal Explorer. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
