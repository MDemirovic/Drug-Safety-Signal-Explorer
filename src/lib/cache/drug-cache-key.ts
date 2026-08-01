import "server-only";

import { createHash } from "node:crypto";

function digestName(value: string) {
  return createHash("sha256")
    .update(value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US"))
    .digest("hex");
}

export function buildDrugAliasKey(inputName: string) {
  return `alias:${digestName(inputName)}`;
}

export function buildDrugCacheKey(identity: {
  rxcui: string | null;
  normalizedName: string;
}) {
  if (identity.rxcui) {
    return `rxcui:${identity.rxcui}`;
  }

  const digest = digestName(identity.normalizedName);
  return `name:${digest}`;
}
