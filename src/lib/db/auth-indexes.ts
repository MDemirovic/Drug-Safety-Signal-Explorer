import "server-only";

import type { Db } from "mongodb";

let betterAuthUserEmailIndexPromise: Promise<string> | undefined;

async function createBetterAuthUserEmailIndex(database: Db) {
  const users = database.collection("user");
  const duplicateEmails = await users
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$email", count: { $sum: 1 } } },
      { $match: { _id: { $type: "string" }, count: { $gt: 1 } } },
      { $limit: 1 },
    ])
    .toArray();

  if (duplicateEmails.length > 0) {
    throw new Error(
      'Better Auth collection "user" contains duplicate emails. Resolve them before creating the unique email index.',
    );
  }

  return users.createIndex(
    { email: 1 },
    { name: "email_unique", unique: true },
  );
}

export function ensureBetterAuthUserEmailIndex(database: Db) {
  if (!betterAuthUserEmailIndexPromise) {
    betterAuthUserEmailIndexPromise =
      createBetterAuthUserEmailIndex(database).catch((error: unknown) => {
        betterAuthUserEmailIndexPromise = undefined;
        throw error;
      });
  }

  return betterAuthUserEmailIndexPromise;
}
