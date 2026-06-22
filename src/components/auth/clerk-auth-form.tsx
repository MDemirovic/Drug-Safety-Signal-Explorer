"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import { ArrowRight, Eye, EyeOff, Loader2, Mail, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ClerkAuthFormProps = {
  mode: "login" | "register";
};

type ClerkFormError = {
  longMessage?: string;
  message?: string;
};

type ClerkFormResult = {
  error: ClerkFormError | null;
};

type EmailVerificationFlow = {
  sendCode: () => Promise<ClerkFormResult>;
  verifyCode: (params: { code: string }) => Promise<ClerkFormResult>;
};

const fieldInputClass =
  "h-14 w-full rounded-2xl border border-[#dce6e8] bg-[#fbfdfd] px-11 text-sm font-medium text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition placeholder:text-[var(--muted-light)] hover:border-[#cfdcde] focus:border-[var(--signal-dark)] focus:bg-white focus:ring-4 focus:ring-[rgba(69,201,181,0.16)]";

const fieldInputWithActionClass =
  "h-14 w-full rounded-2xl border border-[#dce6e8] bg-[#fbfdfd] px-11 pr-12 text-sm font-medium text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition placeholder:text-[var(--muted-light)] hover:border-[#cfdcde] focus:border-[var(--signal-dark)] focus:bg-white focus:ring-4 focus:ring-[rgba(69,201,181,0.16)]";

const primaryButtonClass =
  "inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--ink),var(--ink-soft))] px-5 text-sm font-extrabold text-white shadow-[0_18px_34px_rgba(6,75,71,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(6,75,71,0.22)] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-60";

function isEmailVerificationFlow(value: unknown): value is EmailVerificationFlow {
  return (
    typeof value === "object" &&
    value !== null &&
    "sendCode" in value &&
    typeof value.sendCode === "function" &&
    "verifyCode" in value &&
    typeof value.verifyCode === "function"
  );
}

function getFormErrorMessage(error: ClerkFormError) {
  return error.longMessage ?? error.message ?? "Something went wrong. Please try again.";
}

function getClerkError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown }).errors)
  ) {
    const [firstError] = (error as {
      errors: Array<{ longMessage?: string; message?: string }>;
    }).errors;

    if (firstError) {
      return firstError.longMessage ?? firstError.message ?? "Something went wrong. Please try again.";
    }
  }

  return "Something went wrong. Please try again.";
}

export function ClerkAuthForm({ mode }: ClerkAuthFormProps) {
  const router = useRouter();
  const signInState = useSignIn();
  const signUpState = useSignUp();
  const isRegister = mode === "register";
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const signIn = signInState.signIn;
  const signUp = signUpState.signUp;
  const isLoading =
    isSubmitting ||
    (isRegister
      ? signUpState.fetchStatus === "fetching"
      : signInState.fetchStatus === "fetching");

  function completeSession() {
    router.push("/");
    router.refresh();
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if ((isRegister && !signUp) || (!isRegister && !signIn)) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      if (isRegister) {
        const createResult = await signUp.create({
          emailAddress,
          password,
        });

        if (createResult.error) {
          setError(getFormErrorMessage(createResult.error));
          return;
        }

        if (signUp.status === "complete") {
          const finalizeResult = await signUp.finalize();

          if (finalizeResult.error) {
            setError(getFormErrorMessage(finalizeResult.error));
            return;
          }

          completeSession();
          return;
        }

        const emailVerification = signUp.verifications.emailAddress;

        if (!isEmailVerificationFlow(emailVerification)) {
          setError("Email verification is not available for this sign-up method.");
          return;
        }

        const codeResult = await emailVerification.sendCode();

        if (codeResult.error) {
          setError(getFormErrorMessage(codeResult.error));
          return;
        }

        setPendingVerification(true);
        return;
      }

      const createResult = await signIn.create({
        identifier: emailAddress,
      });

      if (createResult.error) {
        setError(getFormErrorMessage(createResult.error));
        return;
      }

      const passwordResult = await signIn.password({ password });

      if (passwordResult.error) {
        setError(getFormErrorMessage(passwordResult.error));
        return;
      }

      if (signIn.status === "complete") {
        const finalizeResult = await signIn.finalize();

        if (finalizeResult.error) {
          setError(getFormErrorMessage(finalizeResult.error));
          return;
        }

        completeSession();
        return;
      }

      setError("Additional verification is required for this account.");
    } catch (caughtError) {
      setError(getClerkError(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerificationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!signUp) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const emailVerification = signUp.verifications.emailAddress;

      if (!isEmailVerificationFlow(emailVerification)) {
        setError("Email verification is not available for this sign-up method.");
        return;
      }

      const verifyResult = await emailVerification.verifyCode({ code });

      if (verifyResult.error) {
        setError(getFormErrorMessage(verifyResult.error));
        return;
      }

      if (signUp.status === "complete") {
        const finalizeResult = await signUp.finalize();

        if (finalizeResult.error) {
          setError(getFormErrorMessage(finalizeResult.error));
          return;
        }

        completeSession();
        return;
      }

      setError("Verification is not complete yet. Check the code and try again.");
    } catch (caughtError) {
      setError(getClerkError(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (pendingVerification) {
    return (
      <form onSubmit={handleVerificationSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="verification-code"
            className="mb-2.5 block text-xs font-extrabold text-[var(--text)]"
          >
            Verification code
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              id="verification-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={fieldInputClass}
              placeholder="Enter the email code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading || !signUp}
          className={primaryButtonClass}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Verify account
          {!isLoading ? <ArrowRight className="h-4 w-4" /> : null}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleAuthSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="auth-email"
          className="mb-2.5 block text-xs font-extrabold text-[var(--text)]"
        >
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            id="auth-email"
            value={emailAddress}
            onChange={(event) => setEmailAddress(event.target.value)}
            className={fieldInputClass}
            placeholder="Enter your email address"
            type="email"
            autoComplete="email"
            required
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="auth-password"
          className="mb-2.5 block text-xs font-extrabold text-[var(--text)]"
        >
          Password
        </label>
        <div className="relative">
          <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            id="auth-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldInputWithActionClass}
            placeholder={isRegister ? "Create a password" : "Enter your password"}
            type={showPassword ? "text" : "password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={8}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--signal-pale)] hover:text-[var(--ink)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading || (isRegister ? !signUp : !signIn)}
        className={primaryButtonClass}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isRegister ? "Create account" : "Sign in"}
        {!isLoading ? <ArrowRight className="h-4 w-4" /> : null}
      </button>

      <p className="pt-4 text-center text-sm text-[var(--muted)]">
        {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-bold text-[var(--signal-dark)] hover:text-[var(--ink)]"
        >
          {isRegister ? "Sign in" : "Create account"}
        </Link>
      </p>
    </form>
  );
}
