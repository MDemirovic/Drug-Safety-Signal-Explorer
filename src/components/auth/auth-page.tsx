import { LockKeyhole, ShieldCheck } from "lucide-react";

import { ClerkAuthForm } from "@/components/auth/clerk-auth-form";

type AuthPageProps = {
  mode: "login" | "register";
};

export function AuthPage({ mode }: AuthPageProps) {
  const isRegister = mode === "register";

  return (
    <main className="relative flex-1 overflow-x-hidden bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- Bypass next/image cache for this generated hero background. */}
      <img
        src="/auth-lab-tabletop.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[63%_center] sm:object-center"
        aria-hidden="true"
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0.4)_48%,rgba(255,255,255,0.12)_100%)] md:bg-[linear-gradient(90deg,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0.2)_43%,rgba(255,255,255,0.03)_72%,rgba(255,255,255,0)_100%)]" />

      <div className="relative mx-auto grid min-h-[calc(100svh-5rem)] w-full max-w-[95rem] gap-7 px-5 py-8 sm:px-8 sm:py-10 md:min-h-[calc(100svh-10rem)] md:grid-cols-[minmax(0,0.9fr)_minmax(21rem,1.1fr)] md:items-center md:gap-5 md:py-8 lg:grid-cols-[0.96fr_1.04fr] lg:gap-8 lg:px-12 lg:pt-5 lg:pb-16 xl:px-16">
        <section className="reveal mx-auto w-full max-w-[39rem] rounded-[1.5rem] bg-white/0 md:mx-0 lg:ml-[clamp(0rem,4vw,3.8rem)]">
          <div className="inline-flex items-center gap-2 rounded-xl bg-[#dff5f0]/90 px-3 py-2 text-[var(--signal-dark)] shadow-[0_10px_28px_rgba(13,166,145,0.09)] ring-1 ring-white/80">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-extrabold tracking-[0.16em] uppercase">
              {isRegister ? "Secure onboarding" : "Account access"}
            </span>
          </div>
          <h1 className="mt-6 max-w-2xl font-display text-4xl leading-[1.03] text-[var(--ink)] drop-shadow-[0_2px_0_rgba(255,255,255,0.7)] sm:text-5xl md:mt-5 md:text-[2.85rem] lg:mt-6 lg:text-6xl xl:mt-7 xl:text-[4.55rem]">
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
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg md:mt-4 md:text-base lg:mt-6 lg:text-lg xl:mt-7 xl:text-xl xl:leading-8">
            {isRegister
              ? "Start saving your pharmacovigilance work in one secure account."
              : "Access your private dashboard and continue turning pharmacovigilance data into meaningful insights."}
          </p>

          <div className="mt-6 flex max-w-xl items-start gap-3 text-[var(--text)] md:mt-5 lg:mt-7 lg:gap-4 xl:mt-9">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#dff5f0]/95 text-[var(--signal-dark)] shadow-[inset_0_0_0_1px_rgba(13,166,145,0.12)] lg:h-12 lg:w-12">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <p className="text-sm leading-6 lg:text-base">
              Your data is secure, encrypted, and always private. We take your
              privacy seriously.
            </p>
          </div>
        </section>

        <section className="reveal reveal-delay relative flex justify-center md:justify-end lg:justify-start">
          <div className="relative w-full max-w-[30rem] origin-center rounded-[1.5rem] border border-white/80 bg-white/92 p-5 shadow-[0_24px_55px_rgba(35,64,67,0.16)] backdrop-blur-sm sm:p-7 md:max-w-[25rem] md:p-6 lg:ml-[2.5vw] lg:mt-0 lg:max-w-[29rem] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-5 lg:shadow-none lg:backdrop-blur-none lg:[transform:perspective(1300px)_rotateZ(1.80deg)_skewY(0.80deg)] xl:ml-[3.3vw] xl:p-7">
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
