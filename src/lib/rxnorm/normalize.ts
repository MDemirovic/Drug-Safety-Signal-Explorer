import "server-only";

import { createHash } from "node:crypto";

import {
  createRxNormClient,
  type RxNormLookupClient,
} from "@/lib/rxnorm/client";

const MAX_DRUG_NAME_LENGTH = 120;
const defaultClient = createRxNormClient();

export type NormalizedDrug = {
  inputName: string;
  normalizedName: string;
  slug: string;
  rxcui: string | null;
  source: "rxnorm" | "fallback";
};

export function cleanDrugName(input: string) {
  const cleaned = input.normalize("NFKC").trim().replace(/\s+/g, " ");

  if (!cleaned) {
    throw new Error("A drug name is required.");
  }

  if (cleaned.length > MAX_DRUG_NAME_LENGTH) {
    throw new Error(
      `Drug names must be ${MAX_DRUG_NAME_LENGTH} characters or fewer.`,
    );
  }

  if (/\p{Cc}/u.test(cleaned)) {
    throw new Error("Drug names cannot contain control characters.");
  }

  return cleaned;
}

export function drugNameToSlug(name: string) {
  const decomposedName = name.normalize("NFKD").toLowerCase();
  const comparableName = decomposedName.replace(/[\u0300-\u036f]/g, "");
  const fullSlug = comparableName
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const isLossy = /[^a-z0-9]/.test(decomposedName);
  const needsHash = !fullSlug || fullSlug.length > 100 || isLossy;

  if (!needsHash) {
    return fullSlug;
  }

  const hash = createHash("sha256")
    .update(name.normalize("NFKC").toLocaleLowerCase("en-US"))
    .digest("hex")
    .slice(0, 32);
  const prefix = (fullSlug || "drug").slice(0, 67).replace(/-+$/g, "");

  return `${prefix}-${hash}`;
}

export async function normalizeDrugName(
  input: string,
  options: { client?: RxNormLookupClient } = {},
): Promise<NormalizedDrug> {
  const inputName = cleanDrugName(input);

  try {
    const match = await (options.client ?? defaultClient).lookup(inputName);
    if (match?.name.trim()) {
      const normalizedName = match.name.trim();
      return {
        inputName,
        normalizedName,
        slug: drugNameToSlug(normalizedName),
        rxcui: match.rxcui,
        source: "rxnorm",
      };
    }
  } catch (error) {
    console.error(`RxNorm normalization failed for "${inputName}".`, error);
  }

  return {
    inputName,
    normalizedName: inputName.toLocaleLowerCase("en-US"),
    slug: drugNameToSlug(inputName),
    rxcui: null,
    source: "fallback",
  };
}
