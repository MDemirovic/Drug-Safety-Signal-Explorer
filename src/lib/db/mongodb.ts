import "server-only";

import { Db, MongoClient, ServerApiVersion } from "mongodb";

import { readMongoEnv } from "@/lib/env/server";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: MongoClient;
  mongoClientPromise?: Promise<MongoClient>;
};

function getMongoUri() {
  return readMongoEnv().MONGODB_URI;
}

function getMongoDatabaseName() {
  return readMongoEnv().MONGODB_DB;
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
