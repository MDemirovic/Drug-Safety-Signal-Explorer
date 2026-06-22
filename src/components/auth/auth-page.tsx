import { LockKeyhole, ShieldCheck } from "lucide-react";

import { ClerkAuthForm } from "@/components/auth/clerk-auth-form";

type AuthPageProps = {
  mode: "login" | "register";
};

export function AuthPage({ mode }: AuthPageProps) {
  const isRegister = mode === "register";

  return (
    <main className="relative flex-1 overflow-hidden bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- Bypass next/image cache for this generated hero background. */}
      <img
        src="/auth-lab-tabletop-v4.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        aria-hidden="true"
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.17)_38%,rgba(255,255,255,0.035)_58%,rgba(255,255,255,0)_100%)]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-10rem)] max-w-[95rem] gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[0.96fr_1.04fr] lg:items-center lg:px-12 xl:px-16">
        <section className="reveal max-w-[39rem] rounded-[1.5rem] bg-white/0 lg:ml-[4vw]">
          <div className="inline-flex items-center gap-2 rounded-xl bg-[#dff5f0]/90 px-3 py-2 text-[var(--signal-dark)] shadow-[0_10px_28px_rgba(13,166,145,0.09)] ring-1 ring-white/80">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-extrabold tracking-[0.16em] uppercase">
              {isRegister ? "Secure onboarding" : "Account access"}
            </span>
          </div>
          <h1 className="mt-7 max-w-2xl font-display text-5xl leading-[1.03] text-[var(--ink)] drop-shadow-[0_2px_0_rgba(255,255,255,0.7)] sm:text-6xl lg:text-[4.55rem]">
            {isRegister ? (
              <>
                Create your private signal workspace.
              </>
            ) : (
              <>
                Welcome back to your{" "}
                <span className="text-[var(--ink-soft)]">signal workspace.</span>
              </>
            )}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
            {isRegister
              ? "Start saving your pharmacovigilance work in one secure account."
              : "Access your private dashboard and continue turning pharmacovigilance data into meaningful insights."}
          </p>

          <div className="mt-9 flex max-w-xl items-start gap-4 text-[var(--text)]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#dff5f0]/95 text-[var(--signal-dark)] shadow-[inset_0_0_0_1px_rgba(13,166,145,0.12)]">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <p className="text-sm leading-6 sm:text-base">
              Your data is secure, encrypted, and always private. We take your
              privacy seriously.
            </p>
          </div>
        </section>

        <section className="reveal reveal-delay relative flex justify-center lg:justify-start">
          <div className="relative w-full origin-center p-5 sm:p-7 lg:ml-[2.5vw] lg:mt-4 lg:max-w-[29rem] lg:[transform:perspective(1300px)_rotateZ(1.80deg)_skewY(0.80deg)] xl:ml-[3.3vw]">
            <div className="relative">
              <div className="flex items-start justify-between gap-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#dff5f0,#fbfffd)] text-[var(--signal-dark)] shadow-[inset_0_0_0_1px_rgba(13,166,145,0.15),0_10px_22px_rgba(13,166,145,0.08)]">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-[#dfe6e8] bg-white/78 px-3 py-1.5 text-[0.66rem] font-extrabold tracking-[0.15em] text-[var(--muted)] uppercase shadow-[0_8px_18px_rgba(38,54,83,0.04)]">
                  Private
                </span>
              </div>

              <div className="mt-7">
                <h2 className="text-[2rem] font-extrabold leading-tight text-[var(--ink)]">
                  {isRegister ? "Create account" : "Welcome back"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {isRegister
                    ? "Create an account to continue to Drug Safety Signal Explorer."
                    : "Sign in to continue to Drug Safety Signal Explorer."}
                </p>
              </div>

              <div className="my-6 h-px bg-[linear-gradient(90deg,transparent,var(--line),transparent)]" />

              <ClerkAuthForm mode={mode} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
