import "server-only";

import { Db, MongoClient, ServerApiVersion } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

function getMongoUri() {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not configured. Add it to your local environment file before using MongoDB.",
    );
  }

  return uri;
}

function getMongoDatabaseName() {
  const databaseName = process.env.MONGODB_DB?.trim();

  if (!databaseName) {
    throw new Error(
      "MONGODB_DB is not configured. Add it to your local environment file before using MongoDB.",
    );
  }

  return databaseName;
}

function createMongoClient() {
  return new MongoClient(getMongoUri(), {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
}

export function getMongoClient() {
  if (!globalForMongo.mongoClientPromise) {
    const connectionPromise = createMongoClient().connect();
    const retryableConnectionPromise = connectionPromise.catch((error) => {
      if (globalForMongo.mongoClientPromise === retryableConnectionPromise) {
        globalForMongo.mongoClientPromise = undefined;
      }

      throw error;
    });

    globalForMongo.mongoClientPromise = retryableConnectionPromise;
  }

  return globalForMongo.mongoClientPromise;
}

export async function getDatabase(): Promise<Db> {
  const databaseName = getMongoDatabaseName();
  const client = await getMongoClient();

  return client.db(databaseName);
}
