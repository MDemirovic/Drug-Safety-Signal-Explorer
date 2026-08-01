"use client";

import { LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DrugSearchForm() {
  const router = useRouter();
  const [drugName, setDrugName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function searchDrug(name: string) {
    const cleaned = name.trim();
    if (!cleaned || isSearching) return;

    setIsSearching(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/drugs/search?name=${encodeURIComponent(cleaned)}`,
      );
      const body = (await response.json()) as { slug?: string; error?: string };
      if (!response.ok || !body.slug) {
        throw new Error(body.error ?? "The drug snapshot could not be prepared.");
      }
      router.push(`/drug/${body.slug}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search failed.");
      setIsSearching(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void searchDrug(drugName);
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
            onChange={(event) => {
              setDrugName(event.target.value);
              setError(null);
            }}
            placeholder="Search a drug: omeprazole, ibuprofen, rifaximin..."
            className="h-16 rounded-xl border-[var(--line)] bg-white pr-5 pl-13 shadow-[0_3px_12px_rgba(21,54,59,0.06)]"
            autoComplete="off"
          />
        </div>
        <Button
          size="lg"
          type="submit"
          disabled={isSearching || !drugName.trim()}
          className="h-16 rounded-xl px-8 shadow-[0_8px_20px_rgba(5,74,70,0.18)]"
        >
          {isSearching ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          {isSearching ? "Preparing…" : "Explore drug"}
        </Button>
      </form>
      <div className="mt-5 flex flex-wrap items-center gap-2.5 text-sm">
        <span className="mr-1 font-semibold text-[var(--text)]">Try examples:</span>
        {["Omeprazole", "Ibuprofen", "Rifaximin", "Isotretinoin"].map((drug) => (
          <button
            type="button"
            key={drug}
            onClick={() => {
              setDrugName(drug);
              void searchDrug(drug);
            }}
            disabled={isSearching}
            className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--signal-dark)] hover:text-[var(--ink)]"
          >
            {drug}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-[var(--warning)]" role="alert">{error}</p>}
    </div>
  );
}
