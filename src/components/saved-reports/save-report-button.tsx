"use client";

import { useUser } from "@clerk/nextjs";
import { Bookmark, Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SaveReportButton({ slug }: { slug: string }) {
  const { isLoaded, isSignedIn } = useUser();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function saveReport() {
    if (!isSignedIn || status === "saving") return;
    setStatus("saving");
    setError("");

    try {
      const response = await fetch("/api/saved-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The report could not be saved.");
      setStatus("saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The report could not be saved.");
      setStatus("error");
    }
  }

  if (!isLoaded) {
    return <div className="h-11 w-36 animate-pulse rounded-full bg-[var(--paper-deep)]" aria-hidden="true" />;
  }

  if (!isSignedIn) {
    return (
      <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}>
        <Bookmark className="h-4 w-4" />
        Log in to save
      </Link>
    );
  }

  return (
    <div className="shrink-0 text-right">
      <Button
        type="button"
        variant={status === "saved" ? "outline" : "default"}
        disabled={status === "saving" || status === "saved"}
        onClick={saveReport}
      >
        {status === "saving" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : status === "saved" ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        {status === "saving" ? "Saving…" : status === "saved" ? "Report saved" : "Save report"}
      </Button>
      {error && <p className="mt-2 max-w-64 text-xs font-semibold text-red-700" role="alert">{error}</p>}
    </div>
  );
}
