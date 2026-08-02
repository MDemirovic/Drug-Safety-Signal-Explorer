import "server-only";

import { randomUUID } from "node:crypto";

import { assertSummaryGrounding, createMistralSummaryClient, MistralSummaryError, type MistralSummaryClient } from "@/lib/ai/mistral-client";
import { acquireAiSummaryLease, getCachedAiSummary, releaseAiSummaryLease, renewAiSummaryLease, saveAiSummary } from "@/lib/ai/summary-cache";
import { snapshotHash } from "@/lib/ai/snapshot-hash";
import type { AiSummaryDocument, AiSummaryPayload } from "@/types/ai-summary";

export const AI_PROMPT_VERSION = "faers-summary-v3";
export const AI_SUMMARY_TTL_MS = 30 * 24 * 60 * 60_000;
export const AI_SUMMARY_LEASE_MS = 30_000;
const LEASE_POLL_MS = 500;
const LEASE_POLL_ATTEMPTS = 45;
const LEASE_HEARTBEAT_MS = 10_000;

type Dependencies = {
  client: MistralSummaryClient;
  getCached: (query: Pick<AiSummaryDocument, "subjectType" | "subjectKey" | "snapshotHash" | "promptVersion" | "model">) => Promise<AiSummaryDocument | null>;
  save: (summary: AiSummaryDocument) => Promise<boolean>;
  now: () => Date;
  acquireLease?: (leaseKey: string, owner: string, now: Date, leaseUntil: Date) => Promise<number | null>;
  releaseLease?: (leaseKey: string, owner: string) => Promise<void>;
  renewLease?: (leaseKey: string, owner: string, leaseUntil: Date) => Promise<boolean>;
  sleep?: (milliseconds: number) => Promise<void>;
  inFlight?: Map<string, Promise<AiSummaryPayload>>;
  leaseMs?: number;
  leaseHeartbeatMs?: number;
  leasePollMs?: number;
  leasePollAttempts?: number;
};
const defaultClient = createMistralSummaryClient();
const defaults: Dependencies = {
  client: defaultClient,
  getCached: getCachedAiSummary,
  save: saveAiSummary,
  now: () => new Date(),
  acquireLease: acquireAiSummaryLease,
  releaseLease: releaseAiSummaryLease,
  renewLease: renewAiSummaryLease,
  sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
};

const inFlight = new Map<string, Promise<AiSummaryPayload>>();

function payload(document: AiSummaryDocument, cacheStatus: "hit" | "miss"): AiSummaryPayload {
  return {
    subjectType: document.subjectType,
    subjectKey: document.subjectKey,
    snapshotHash: document.snapshotHash,
    promptVersion: document.promptVersion,
    model: document.model,
    summary: document.summary,
    createdAt: document.createdAt.toISOString(),
    cacheStatus,
  };
}

export async function buildAiSummary(options: {
  subjectType: "drug" | "comparison";
  subjectKey: string;
  snapshot: unknown;
  dependencies?: Dependencies;
  beforeGenerate?: () => void | Promise<void>;
  expiresAt?: Date;
}): Promise<AiSummaryPayload> {
  const deps = options.dependencies ?? defaults;
  const requestsInFlight = deps.inFlight ?? inFlight;
  const hash = snapshotHash(options.snapshot);
  const cacheKey = [options.subjectType, options.subjectKey, hash, AI_PROMPT_VERSION, deps.client.model].join(":");
  const query = {
    subjectType: options.subjectType,
    subjectKey: options.subjectKey,
    snapshotHash: hash,
    promptVersion: AI_PROMPT_VERSION,
    model: deps.client.model,
  } as const;
  const cached = await deps.getCached(query);
  if (cached) {
    assertSummaryGrounding(cached.summary, options.snapshot);
    return payload(cached, "hit");
  }
  const existing = requestsInFlight.get(cacheKey);
  if (existing) return existing;

  const build = (async () => {
    const owner = randomUUID();
    const leaseKey = snapshotHash({ cacheKey });
    const leaseMs = deps.leaseMs ?? AI_SUMMARY_LEASE_MS;
    let ownsLease = !deps.acquireLease;
    let generationToken = 0;
    let leaseLost = false;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let heartbeatTask: Promise<void> | undefined;
    const renew = async () => {
      if (!deps.renewLease) return true;
      const now = deps.now();
      return deps.renewLease(leaseKey, owner, new Date(now.getTime() + leaseMs));
    };
    try {
      if (deps.acquireLease) {
        const attempts = deps.leasePollAttempts ?? LEASE_POLL_ATTEMPTS;
        for (let attempt = 0; attempt < attempts; attempt += 1) {
          const available = await deps.getCached(query);
          if (available) {
            assertSummaryGrounding(available.summary, options.snapshot);
            return payload(available, "hit");
          }
          const now = deps.now();
          const token = await deps.acquireLease(leaseKey, owner, now, new Date(now.getTime() + leaseMs));
          if (token !== null) {
            generationToken = token;
            ownsLease = true;
            break;
          }
          await (deps.sleep ?? defaults.sleep!)(deps.leasePollMs ?? LEASE_POLL_MS);
        }
        if (!ownsLease) throw new MistralSummaryError("AI summary generation is already in progress.");
        const winner = await deps.getCached(query);
        if (winner) {
          assertSummaryGrounding(winner.summary, options.snapshot);
          return payload(winner, "hit");
        }
      }
      if (ownsLease && deps.renewLease) {
        heartbeat = setInterval(() => {
          if (heartbeatTask) return;
          heartbeatTask = renew()
            .then((renewed) => { if (!renewed) leaseLost = true; })
            .catch(() => { leaseLost = true; })
            .finally(() => { heartbeatTask = undefined; });
        }, deps.leaseHeartbeatMs ?? LEASE_HEARTBEAT_MS);
      }
      await options.beforeGenerate?.();
      if (heartbeatTask) await heartbeatTask;
      if (leaseLost || !(await renew())) throw new MistralSummaryError("AI summary generation lease was lost.");
      const summary = await deps.client.summarize(JSON.stringify(options.snapshot));
      if (heartbeatTask) await heartbeatTask;
      if (leaseLost || !(await renew())) throw new MistralSummaryError("AI summary generation lease was lost.");
      const createdAt = deps.now();
      const document: AiSummaryDocument = {
        ...query,
        generationToken,
        summary,
        createdAt,
        expiresAt: options.expiresAt ?? new Date(createdAt.getTime() + AI_SUMMARY_TTL_MS),
      };
      const saved = await deps.save(document);
      if (!saved) {
        const winner = await deps.getCached(query);
        if (winner) {
          assertSummaryGrounding(winner.summary, options.snapshot);
          return payload(winner, "hit");
        }
        throw new MistralSummaryError("A newer AI summary generation superseded this request.");
      }
      return payload(document, "miss");
    } finally {
      if (heartbeat) clearInterval(heartbeat);
      if (heartbeatTask) await heartbeatTask;
      if (ownsLease && deps.releaseLease) {
        await deps.releaseLease(leaseKey, owner).catch(() => undefined);
      }
    }
  })();
  requestsInFlight.set(cacheKey, build);
  try {
    return await build;
  } finally {
    if (requestsInFlight.get(cacheKey) === build) requestsInFlight.delete(cacheKey);
  }
}

export type { Dependencies as AiSummaryDependencies };
