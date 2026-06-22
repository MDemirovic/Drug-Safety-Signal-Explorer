"use client";

import { useUser } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import Link from "next/link";

import { UserMenu } from "@/components/auth/user-menu";

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
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div
        className="hidden h-11 w-44 rounded-xl bg-[var(--paper-deep)] md:block"
        aria-hidden="true"
      />
    );
  }

  if (!isSignedIn) {
    return <GuestAuth />;
  }

  return (
    <div className="ml-1">
      <UserMenu />
    </div>
  );
}
