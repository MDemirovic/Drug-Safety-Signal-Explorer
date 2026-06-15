import { LockKeyhole } from "lucide-react";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

type AuthPageProps = {
  mode: "login" | "register";
};

export function AuthPage({ mode }: AuthPageProps) {
  const isRegister = mode === "register";

  return (
    <main className="relative flex-1 overflow-hidden">
      <div className="page-grid absolute inset-0 opacity-60" />
      <div className="relative mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <section className="reveal max-w-xl">
          <p className="eyebrow">
            {isRegister ? "Create an account" : "Account access"}
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-[-0.04em] text-[var(--ink)] sm:text-6xl">
            {isRegister
              ? "Keep your signal exploration organized."
              : "Welcome back to your signal workspace."}
          </h1>
          <p className="mt-6 text-lg leading-8 text-[var(--muted)]">
            Accounts provide access to the private dashboard. Saved reports will
            be added in a later phase.
          </p>
        </section>

        <section className="reveal reveal-delay rounded-[2rem] border border-[var(--line)] bg-white/80 p-7 shadow-[0_30px_100px_rgba(28,53,54,0.1)] backdrop-blur sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--signal-pale)] text-[var(--signal-dark)]">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <h2 className="mt-6 font-display text-3xl tracking-[-0.03em] text-[var(--ink)]">
            {isRegister ? "Create your account" : "Log in securely"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {isRegister
              ? "Use your name, email, and a password of at least 8 characters."
              : "Enter the email and password associated with your account."}
          </p>
          <Suspense
            fallback={
              <div className="mt-8 h-72 animate-pulse rounded-2xl bg-[var(--paper-deep)]" />
            }
          >
            <AuthForm mode={mode} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
