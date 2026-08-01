import "server-only";

import { getCollections } from "@/lib/db/collections";

const SEARCH_LOG_TTL_MS = 90 * 24 * 60 * 60 * 1_000;

export async function logDrugSearch(entry: {
  query: string;
  slug?: string;
  cacheStatus?: "hit" | "miss" | "refreshed";
  outcome: "success" | "error";
  errorCode?: string;
}) {
  try {
    const { searchLogs } = await getCollections();
    const createdAt = new Date();
    await searchLogs.insertOne({
      ...entry,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + SEARCH_LOG_TTL_MS),
    });
  } catch (error) {
    console.error("Unable to write the drug search log.", error);
  }
}
