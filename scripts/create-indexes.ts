import { config } from "dotenv";
import type { Collection, Db, Document } from "mongodb";

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

async function ensureDrugSnapshotTtlIndex(
  database: Db,
  collection: Collection<Document>,
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

async function createIndexes() {
  const [{ getCollections }, { getDatabase }] = await Promise.all([
    import("../src/lib/db/collections"),
    import("../src/lib/db/mongodb"),
  ]);
  const database = await getDatabase();
  shouldCloseMongoClient = true;
  const collections = await getCollections(database);

  const results = await Promise.all([
    collections.drugSnapshots.createIndex(
      { slug: 1 },
      { name: "slug_unique", unique: true },
    ),
    ensureDrugSnapshotTtlIndex(database, collections.drugSnapshots),
    collections.comparisonSnapshots.createIndex(
      { comparisonKey: 1 },
      { name: "comparison_key_unique", unique: true },
    ),
    collections.aiSummaries.createIndex(
      {
        subjectType: 1,
        subjectKey: 1,
        snapshotHash: 1,
        promptVersion: 1,
      },
      { name: "summary_cache_unique", unique: true },
    ),
    collections.savedReports.createIndex(
      { userId: 1 },
      { name: "saved_reports_user_id" },
    ),
    collections.apiLogs.createIndex(
      { createdAt: -1 },
      { name: "api_logs_created_at" },
    ),
    collections.searchLogs.createIndex(
      { createdAt: -1 },
      { name: "search_logs_created_at" },
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
