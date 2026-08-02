import { config } from "dotenv";
import type { Collection, Db, Document, ObjectId } from "mongodb";
import type { DrugIdentity } from "../src/types/drug-snapshot";
import { uniqueOwnerIds } from "../src/lib/db/identity-index-migration";

config({ path: [".env.local", ".env"], quiet: true });

let shouldCloseMongoClient = false;

function isNamespaceNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 26
  );
}

function isExpiresAtAscendingIndex(index: Document) {
  const key = index.key;

  return (
    typeof key === "object" &&
    key !== null &&
    Object.keys(key).length === 1 &&
    key.expiresAt === 1
  );
}

async function ensureDrugSnapshotTtlIndex<TSchema extends Document>(
  database: Db,
  collection: Collection<TSchema>,
) {
  const indexName = "expires_at";
  let existingIndex: Document | undefined;

  try {
    const indexes = await collection.listIndexes().toArray();
    existingIndex = indexes.find((index) => index.name === indexName);
  } catch (error) {
    if (!isNamespaceNotFound(error)) {
      throw error;
    }
  }

  if (existingIndex && !isExpiresAtAscendingIndex(existingIndex)) {
    throw new Error(
      `MongoDB index "${indexName}" exists with an unexpected key. Remove or rename it before creating the expiresAt TTL index.`,
    );
  }

  if (existingIndex?.expireAfterSeconds === 0) {
    return indexName;
  }

  if (existingIndex) {
    await database.command({
      collMod: collection.collectionName,
      index: { name: indexName, expireAfterSeconds: 0 },
    });

    return indexName;
  }

  return collection.createIndex(
    { expiresAt: 1 },
    { name: indexName, expireAfterSeconds: 0 },
  );
}

async function dropIndexIfPresent<TSchema extends Document>(
  collection: Collection<TSchema>,
  indexName: string,
) {
  try {
    const indexes = await collection.listIndexes().toArray();
    if (indexes.some((index) => index.name === indexName)) {
      await collection.dropIndex(indexName);
    }
  } catch (error) {
    if (!isNamespaceNotFound(error)) {
      throw error;
    }
  }
}

async function prepareUniqueAliasIndex(
  collection: Collection<DrugIdentity>,
) {
  try {
    const index = (await collection.listIndexes().toArray()).find(
      (candidate) => candidate.name === "drug_identity_alias_keys",
    );
    const partialFilter = index?.partialFilterExpression;
    const hasExpectedPartialFilter =
      typeof partialFilter === "object" &&
      partialFilter !== null &&
      typeof partialFilter["aliasKeys.0"] === "object" &&
      partialFilter["aliasKeys.0"] !== null &&
      partialFilter["aliasKeys.0"].$exists === true;
    const isCompatible =
      index?.unique === true &&
      index.key?.aliasKeys === 1 &&
      hasExpectedPartialFilter;

    if (!isCompatible) {
      if (!index || index.unique !== true) {
        const duplicates = await collection
          .aggregate<{ _id: string; owners: ObjectId[] }>([
            { $unwind: "$aliasKeys" },
            { $sort: { updatedAt: -1, _id: 1 } },
            {
              $group: {
                _id: "$aliasKeys",
                owners: { $push: "$_id" },
                count: { $sum: 1 },
              },
            },
            { $match: { count: { $gt: 1 } } },
          ])
          .toArray();

        for (const duplicate of duplicates) {
          const uniqueOwners = uniqueOwnerIds(duplicate.owners);
          if (uniqueOwners.length <= 1) continue;
          await collection.updateMany(
            { _id: { $in: uniqueOwners.slice(1) } },
            { $pull: { aliasKeys: duplicate._id } },
          );
        }
        await collection.updateMany(
          { aliasKeys: { $size: 0 } },
          { $unset: { aliasKeys: "" } },
        );
      }
      if (index) {
        await collection.dropIndex("drug_identity_alias_keys");
      }
    }
  } catch (error) {
    if (!isNamespaceNotFound(error)) {
      throw error;
    }
  }
}

async function createIndexes() {
  const [{ getCollections }, { getDatabase }] = await Promise.all([
    import("../src/lib/db/collections"),
    import("../src/lib/db/mongodb"),
  ]);
  const database = await getDatabase();
  shouldCloseMongoClient = true;
  const collections = await getCollections(database);

  await Promise.all([
    dropIndexIfPresent(collections.drugSnapshots, "cache_key_unique"),
    dropIndexIfPresent(
      collections.comparisonSnapshots,
      "comparison_request_keys_unique",
    ),
    dropIndexIfPresent(collections.aiSummaries, "summary_cache_unique"),
    dropIndexIfPresent(collections.aiSummaryLeases, "summary_lease_ttl"),
    dropIndexIfPresent(
      collections.drugIdentities,
      "drug_identity_cache_key_unique",
    ),
  ]);
  await prepareUniqueAliasIndex(collections.drugIdentities);

  const results = await Promise.all([
    collections.drugSnapshots.createIndex(
      { slug: 1 },
      { name: "slug_unique", unique: true },
    ),
    collections.drugSnapshots.createIndex(
      { cacheKey: 1 },
      { name: "cache_key" },
    ),
    ensureDrugSnapshotTtlIndex(database, collections.drugSnapshots),
    collections.drugIdentities.createIndex(
      { slug: 1 },
      { name: "drug_identity_slug_unique", unique: true },
    ),
    collections.drugIdentities.createIndex(
      { cacheKey: 1 },
      { name: "drug_identity_cache_key" },
    ),
    collections.drugIdentities.createIndex(
      { aliasKeys: 1 },
      {
        name: "drug_identity_alias_keys",
        unique: true,
        partialFilterExpression: { "aliasKeys.0": { $exists: true } },
      },
    ),
    collections.comparisonSnapshots.createIndex(
      { comparisonKey: 1 },
      { name: "comparison_key_unique", unique: true },
    ),
    collections.comparisonSnapshots.createIndex(
      { requestKeys: 1 },
      {
        name: "comparison_request_keys",
        partialFilterExpression: { "requestKeys.0": { $exists: true } },
      },
    ),
    collections.comparisonSnapshots.createIndex(
      { expiresAt: 1 },
      { name: "comparison_expires_at", expireAfterSeconds: 0 },
    ),
    collections.aiSummaries.createIndex(
      {
        subjectType: 1,
        subjectKey: 1,
        snapshotHash: 1,
        promptVersion: 1,
        model: 1,
      },
      { name: "summary_cache_model_unique", unique: true },
    ),
    collections.aiSummaries.createIndex(
      { expiresAt: 1 },
      { name: "summary_cache_ttl", expireAfterSeconds: 0 },
    ),
    collections.aiSummaryLeases.createIndex(
      { cleanupAt: 1 },
      { name: "summary_lease_cleanup_ttl", expireAfterSeconds: 0 },
    ),
    collections.savedReports.createIndex(
      { userId: 1 },
      { name: "saved_reports_user_id" },
    ),
    collections.savedReports.createIndex(
      { userId: 1, drugSlug: 1 },
      { name: "saved_reports_user_drug_unique", unique: true },
    ),
    collections.apiLogs.createIndex(
      { createdAt: -1 },
      { name: "api_logs_created_at" },
    ),
    collections.apiLogs.createIndex(
      { service: 1, rateLimitKey: 1, windowStart: 1 },
      {
        name: "api_logs_rate_limit_unique",
        unique: true,
        partialFilterExpression: { service: "rate_limit" },
      },
    ),
    collections.apiLogs.createIndex(
      { expiresAt: 1 },
      { name: "api_logs_expires_at", expireAfterSeconds: 0 },
    ),
    collections.searchLogs.createIndex(
      { createdAt: -1 },
      { name: "search_logs_created_at" },
    ),
    collections.searchLogs.createIndex(
      { expiresAt: 1 },
      { name: "search_logs_expires_at", expireAfterSeconds: 0 },
    ),
  ]);

  console.log(`MongoDB indexes are ready in "${database.databaseName}":`);
  results.forEach((name) => console.log(`- ${name}`));
}

createIndexes()
  .catch((error: unknown) => {
    console.error("Failed to create MongoDB indexes.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!shouldCloseMongoClient) {
      return;
    }

    const { getMongoClient } = await import("../src/lib/db/mongodb");
    const client = await getMongoClient().catch(() => null);
    await client?.close();
  });
