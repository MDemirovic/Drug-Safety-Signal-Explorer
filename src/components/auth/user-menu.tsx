"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Bookmark, LogOut, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function UserMenu() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = user?.fullName || user?.firstName || email || "Account";

  async function handleSignOut() {
    setError("");
    setIsSigningOut(true);

    try {
      await signOut({ redirectUrl: "/" });
    } catch {
      setError("Logout is temporarily unavailable. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--signal-pale)]">
        <UserRound className="h-4 w-4" />
        <span className="max-w-32 truncate">{name}</span>
      </summary>
      <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[var(--line)] bg-white p-2 shadow-xl">
        <p className="truncate px-3 py-2 text-xs font-semibold text-[var(--muted)]">
          {email}
        </p>
        <Link
          href="/dashboard/saved-reports"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--text)] hover:bg-[var(--signal-pale)]"
        >
          <Bookmark className="h-4 w-4" />
          Saved reports
        </Link>
        <Link
          href="/account"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--text)] hover:bg-[var(--signal-pale)]"
        >
          <Settings className="h-4 w-4" />
          Account & security
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[var(--text)] hover:bg-[var(--signal-pale)] disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          {isSigningOut ? "Logging out..." : "Log out"}
        </button>
        {error && (
          <p role="alert" className="px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
