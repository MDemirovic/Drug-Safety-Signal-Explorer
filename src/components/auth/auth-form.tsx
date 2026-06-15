"use client";

import { LoaderCircle, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type AuthFormProps = {
  mode: "login" | "register";
};

function getSafeNextPath(value: string | null) {
  if (value === "/admin" || value === "/dashboard/saved-reports") {
    return value;
  }

  return "/";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const isRegister = mode === "register";
  const nextPath = getSafeNextPath(searchParams.get("next"));
  const switchAuthHref = `${isRegister ? "/login" : "/register"}${
    nextPath === "/" ? "" : `?next=${encodeURIComponent(nextPath)}`
  }`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");
      const result = isRegister
        ? await authClient.signUp.email({
            name: String(formData.get("name") ?? "").trim(),
            email,
            password,
          })
        : await authClient.signIn.email({
            email,
            password,
            rememberMe: true,
          });

      if (result.error) {
        setError(
          result.error.status >= 500
            ? "Account service is temporarily unavailable. Please try again."
            : result.error.message ?? "Authentication failed. Please try again.",
        );
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Authentication is temporarily unavailable. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      {isRegister && (
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-[var(--text)]">
            Name
          </span>
          <Input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            placeholder="Your name"
          />
        </label>
      )}

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-[var(--text)]">
          Email
        </span>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-[var(--text)]">
          Password
        </span>
        <Input
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          minLength={8}
          maxLength={128}
          placeholder="At least 8 characters"
        />
      </label>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
        >
          {error}
        </div>
      )}

      <Button className="w-full" size="lg" disabled={isPending} type="submit">
        {isPending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : isRegister ? (
          <UserPlus className="h-4 w-4" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        {isPending
          ? isRegister
            ? "Creating account..."
            : "Logging in..."
          : isRegister
            ? "Create account"
            : "Log in"}
      </Button>

      <p className="text-center text-sm text-[var(--muted)]">
        {isRegister ? "Already have an account?" : "Need an account?"}{" "}
        <Link
          href={switchAuthHref}
          className="font-bold text-[var(--ink)] hover:text-[var(--signal-dark)]"
        >
          {isRegister ? "Log in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}
