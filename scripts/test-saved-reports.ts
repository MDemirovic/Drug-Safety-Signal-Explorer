import assert from "node:assert/strict";

import { ObjectId, type Collection } from "mongodb";

import {
  deleteReportForUser,
  listReportsForUser,
  saveReportForUser,
} from "../src/lib/saved-reports/store";
import type { SavedReportDocument } from "../src/types/saved-report";
import type { DrugSnapshot } from "../src/types/drug-snapshot";

function memoryCollection() {
  const documents: Array<SavedReportDocument & { _id: ObjectId }> = [];
  const collection = {
    async updateOne(filter: Record<string, unknown>, update: Record<string, Record<string, unknown>>) {
      let document = documents.find(
        (candidate) =>
          candidate.userId === filter.userId && candidate.drugSlug === filter.drugSlug,
      );
      if (!document) {
        document = {
          _id: new ObjectId(),
          ...(update.$setOnInsert as Omit<SavedReportDocument, "_id">),
        };
        documents.push(document);
      }
      Object.assign(document, update.$set);
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    },
    async findOne(filter: Record<string, unknown>) {
      return (
        documents.find(
          (candidate) =>
            candidate.userId === filter.userId && candidate.drugSlug === filter.drugSlug,
        ) ?? null
      );
    },
    find(filter: Record<string, unknown>) {
      const matches = documents.filter((candidate) => candidate.userId === filter.userId);
      return {
        sort() {
          return {
            async toArray() {
              return [...matches].sort(
                (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
              );
            },
          };
        },
      };
    },
    async deleteOne(filter: { _id: ObjectId; userId: string }) {
      const index = documents.findIndex(
        (candidate) =>
          candidate.userId === filter.userId && candidate._id.equals(filter._id),
      );
      if (index < 0) return { acknowledged: true, deletedCount: 0 };
      documents.splice(index, 1);
      return { acknowledged: true, deletedCount: 1 };
    },
  } as unknown as Collection<SavedReportDocument>;

  return { collection, documents };
}

const snapshot: DrugSnapshot = {
  cacheKey: "rxcui:7646",
  normalizedName: "Omeprazole",
  slug: "omeprazole",
  rxcui: "7646",
  totalReports: 1000,
  seriousReports: 250,
  nonSeriousReports: 700,
  unknownSeriousnessReports: 50,
  topReactions: [],
  seriousnessBreakdown: {
    death: 10,
    lifeThreatening: 20,
    hospitalization: 100,
    disability: 5,
    congenitalAnomaly: 2,
    otherSerious: 113,
  },
  yearlyTrend: [],
  label: null,
  sourceMeta: {
    eventSource: "openFDA FAERS Drug Event API",
    labelSource: "openFDA Drug Label API",
    normalizationSource: "RxNorm",
    aggregateOnly: true,
    fromYear: 2022,
    toYear: 2026,
    limitation: "Spontaneous reports do not establish causality.",
  },
  computedAt: new Date("2026-08-01T10:00:00.000Z"),
  expiresAt: new Date("2026-08-02T10:00:00.000Z"),
};

async function main() {
  const { collection, documents } = memoryCollection();
  const first = await saveReportForUser("user-a", snapshot, {
    collection,
    now: new Date("2026-08-01T11:00:00.000Z"),
  });
  await saveReportForUser("user-b", snapshot, { collection });
  assert.equal(documents.length, 2, "the same drug must be saved independently per user");

  await saveReportForUser(
    "user-a",
    { ...snapshot, totalReports: 1200, seriousReports: 300 },
    { collection, now: new Date("2026-08-01T12:00:00.000Z") },
  );
  assert.equal(documents.length, 2, "saving the same user/drug pair must be idempotent");
  const userAReports = await listReportsForUser("user-a", collection);
  assert.equal(userAReports.length, 1);
  assert.equal(userAReports[0].totalReports, 1200, "a repeated save must refresh summary values");
  assert.equal(userAReports[0].createdAt, first.createdAt, "a repeated save must preserve creation time");
  assert.ok(userAReports.every((report) => report.drugSlug === "omeprazole"));

  assert.equal(
    await deleteReportForUser("user-b", first.id, collection),
    false,
    "a user must not delete another user's report",
  );
  assert.equal(await deleteReportForUser("user-a", "not-an-object-id", collection), false);
  assert.equal(await deleteReportForUser("user-a", first.id, collection), true);
  assert.equal((await listReportsForUser("user-a", collection)).length, 0);
  assert.equal((await listReportsForUser("user-b", collection)).length, 1);

  console.log("Saved report ownership, idempotency, listing, and deletion checks passed.");
}

void main();
