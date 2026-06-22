import "server-only";

import { Db, MongoClient, ServerApiVersion } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: MongoClient;
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
    serverSelectionTimeoutMS: 5_000,
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
}

export function getMongoClient() {
  if (!globalForMongo.mongoClientPromise) {
    const mongoClient = getMongoClientHandle();
    const connectionPromise = mongoClient.connect();
    const retryableConnectionPromise = connectionPromise.catch((error) => {
      if (globalForMongo.mongoClientPromise === retryableConnectionPromise) {
        globalForMongo.mongoClientPromise = undefined;
      }

      if (globalForMongo.mongoClient === mongoClient) {
        globalForMongo.mongoClient = undefined;
      }

      throw error;
    });

    globalForMongo.mongoClientPromise = retryableConnectionPromise;
  }

  return globalForMongo.mongoClientPromise;
}

export function getMongoClientHandle() {
  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = createMongoClient();
  }

  return globalForMongo.mongoClient;
}

export function getDatabaseHandle(): Db {
  return getMongoClientHandle().db(getMongoDatabaseName());
}

export async function getDatabase(): Promise<Db> {
  await getMongoClient();

  return getDatabaseHandle();
}
