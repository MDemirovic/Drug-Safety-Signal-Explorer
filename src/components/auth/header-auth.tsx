"use client";

import { Menu } from "lucide-react";
import Link from "next/link";

import { UserMenu } from "@/components/auth/user-menu";
import { authClient } from "@/lib/auth-client";

function GuestAuth() {
  return (
    <>
      <div className="hidden items-center gap-1 md:flex">
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
    </>
  );
}

export function HeaderAuth() {
  const { data: session } = authClient.useSession();

  if (session) {
    return (
      <div className="ml-1">
        <UserMenu email={session.user.email} name={session.user.name} />
      </div>
    );
  }

  // Keep public navigation usable while a slow or unavailable database is checked.
  return <GuestAuth />;
}
