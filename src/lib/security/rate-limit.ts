import "server-only";

import { createHash } from "node:crypto";

import { getCollections } from "@/lib/db/collections";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export type RateLimitStore = {
  increment(options: {
    key: string;
    windowStart: Date;
    expiresAt: Date;
  }): Promise<number>;
};

export type RateLimitContext = {
  now?: number;
  store?: RateLimitStore;
  trustProxyHeaders?: boolean;
};

export class RateLimitExceededError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests.");
    this.name = "RateLimitExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const mongoRateLimitStore: RateLimitStore = {
  async increment({ key, windowStart, expiresAt }) {
    const { apiLogs } = await getCollections();
    const document = await apiLogs.findOneAndUpdate(
      {
        service: "rate_limit",
        rateLimitKey: key,
        windowStart,
      },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          service: "rate_limit",
          rateLimitKey: key,
          windowStart,
          createdAt: new Date(),
          expiresAt,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!document || typeof document.count !== "number") {
      throw new Error("The shared rate-limit counter could not be updated.");
    }

    return document.count;
  },
};

function hashedIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function requestClientIdentifier(
  headers: Headers,
  trustProxyHeaders = process.env.RENDER === "true",
) {
  if (!trustProxyHeaders) {
    return null;
  }

  // Render documents that it supplies the real client as the first XFF entry.
  // Only trust that contract when the runtime or an explicit test opts in.
  const forwardedChain = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const address = forwardedChain?.at(0);
  return address ? hashedIdentifier(address) : null;
}

export async function consumeRateLimit(
  options: {
    scope: string;
    identifier: string;
    limit: number;
    windowMs: number;
  },
  context: RateLimitContext = {},
): Promise<RateLimitResult> {
  const now = context.now ?? Date.now();
  const windowStartMs = Math.floor(now / options.windowMs) * options.windowMs;
  const windowEndMs = windowStartMs + options.windowMs;
  const count = await (context.store ?? mongoRateLimitStore).increment({
    key: `${options.scope}:${options.identifier}`,
    windowStart: new Date(windowStartMs),
    expiresAt: new Date(windowEndMs + options.windowMs),
  });

  return {
    allowed: count <= options.limit,
    remaining: Math.max(options.limit - count, 0),
    retryAfterSeconds: Math.max(Math.ceil((windowEndMs - now) / 1_000), 1),
  };
}

async function enforceLimit(
  options: {
    scope: string;
    identifier: string;
    limit: number;
    windowMs: number;
  },
  context: RateLimitContext,
) {
  const result = await consumeRateLimit(options, context);
  if (!result.allowed) {
    throw new RateLimitExceededError(result.retryAfterSeconds);
  }
}

export async function enforceDrugSnapshotBuildLimit(
  headers: Headers,
  context: RateLimitContext = {},
) {
  const identifier = requestClientIdentifier(
    headers,
    context.trustProxyHeaders,
  );
  if (identifier) {
    await enforceLimit(
      {
        scope: "drug-snapshot-build-client",
        identifier,
        limit: 1,
        windowMs: 60_000,
      },
      context,
    );
  }
  await enforceLimit(
    {
      scope: "drug-snapshot-build-global",
      identifier: "all",
      limit: 2,
      windowMs: 60_000,
    },
    context,
  );
}

export async function enforceDrugRequestIngressLimit(
  headers: Headers,
  context: RateLimitContext = {},
) {
  const identifier = requestClientIdentifier(
    headers,
    context.trustProxyHeaders,
  );
  if (identifier) {
    await enforceLimit(
      {
        scope: "drug-request-client",
        identifier,
        limit: 30,
        windowMs: 60_000,
      },
      context,
    );
  }
  await enforceLimit(
    {
      scope: "drug-request-global",
      identifier: "all",
      limit: 120,
      windowMs: 60_000,
    },
    context,
  );
}
