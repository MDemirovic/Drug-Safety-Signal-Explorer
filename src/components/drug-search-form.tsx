"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function toDrugSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function DrugSearchForm() {
  const router = useRouter();
  const [drugName, setDrugName] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = toDrugSlug(drugName);

    if (slug) {
      router.push(`/drug/${slug}`);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="drug-search">
          Search for a drug
        </label>
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2 text-[var(--text)]" />
          <Input
            id="drug-search"
            value={drugName}
            onChange={(event) => setDrugName(event.target.value)}
            placeholder="Search a drug: omeprazole, ibuprofen, rifaximin..."
            className="h-16 rounded-xl border-[var(--line)] bg-white pr-5 pl-13 shadow-[0_3px_12px_rgba(21,54,59,0.06)]"
            autoComplete="off"
          />
        </div>
        <Button
          size="lg"
          type="submit"
          className="h-16 rounded-xl px-8 shadow-[0_8px_20px_rgba(5,74,70,0.18)]"
        >
          <Search className="h-5 w-5" />
          Explore drug
        </Button>
      </form>
      <div className="mt-5 flex flex-wrap items-center gap-2.5 text-sm">
        <span className="mr-1 font-semibold text-[var(--text)]">Try examples:</span>
        {["Omeprazole", "Ibuprofen", "Rifaximin", "Isotretinoin"].map((drug) => (
          <Link
            key={drug}
            href={`/drug/${drug.toLowerCase()}`}
            className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--signal-dark)] hover:text-[var(--ink)]"
          >
            {drug}
          </Link>
        ))}
      </div>
    </div>
  );
}
