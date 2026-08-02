import "server-only";

import { createHash } from "node:crypto";

function stableValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "cacheStatus" && key !== "expiresAt")
        .sort(([left], [right]) => left.localeCompare(right, "en-US"))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

export function snapshotHash(snapshot: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(snapshot)))
    .digest("hex");
}
