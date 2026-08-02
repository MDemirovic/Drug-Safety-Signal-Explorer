import "server-only";

import type { ZodType } from "zod";

import { getCollections } from "@/lib/db/collections";
import { readOpenFdaEnv } from "@/lib/env/server";
import {
  countResponseSchema,
  labelResponseSchema,
  parseCountItems,
  parseDrugLabel,
  parseTotal,
  type CountItem,
  type DrugLabel,
  type OpenFdaCountResponse,
} from "@/lib/openfda/parsers";
import {
  buildDrugEventSearch,
  buildDrugLabelSearch,
  receivedDateClause,
  withSearchClause,
} from "@/lib/openfda/queries";

const OPENFDA_BASE_URL = "https://api.fda.gov";
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_RETRIES = 2;
export const OPENFDA_LOG_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const TRANSIENT_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

type OpenFdaEndpoint = "/drug/event.json" | "/drug/label.json";
type QueryParams = Record<string, string | number | undefined>;

type RequestLog = {
  endpoint: OpenFdaEndpoint;
  params: Record<string, string | number>;
  attempt: number;
  statusCode?: number;
  durationMs: number;
  outcome: "success" | "error";
  errorCode?: string;
  errorMessage?: string;
  createdAt: Date;
  expiresAt: Date;
};

export type OpenFdaClientOptions = {
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
  fetcher?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  logger?: (entry: RequestLog) => Promise<void>;
};

export class OpenFdaError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: { code: string; status?: number; retryable?: boolean; cause?: unknown },
  ) {
    super(message, { cause: options.cause });
    this.name = "OpenFdaError";
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

function configuredApiKey() {
  return readOpenFdaEnv().OPENFDA_API_KEY;
}

function safeParams(params: QueryParams) {
  return Object.fromEntries(
    Object.entries(params).filter(
      (entry): entry is [string, string | number] => entry[1] !== undefined,
    ),
  );
}

async function defaultLogger(entry: RequestLog) {
  const { apiLogs } = await getCollections();
  await apiLogs.insertOne({ service: "openfda", ...entry });
}

async function writeLog(
  logger: (entry: RequestLog) => Promise<void>,
  entry: RequestLog,
) {
  try {
    await logger(entry);
  } catch (error) {
    console.error("Unable to write the openFDA request log.", error);
  }
}

function logRetentionDates() {
  const createdAt = new Date();
  return {
    createdAt,
    expiresAt: new Date(createdAt.getTime() + OPENFDA_LOG_TTL_MS),
  };
}

function errorMessageFromPayload(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null
  ) {
    const error = payload.error as Record<string, unknown>;
    if (typeof error.message === "string") {
      return error.message;
    }
  }

  return undefined;
}

function retryDelay(response: Response | undefined, attempt: number) {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
      return Math.min(Math.max(seconds * 1_000, 0), 60_000);
    }

    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) {
      return Math.min(Math.max(dateDelay, 0), 60_000);
    }
  }

  return 350 * 2 ** (attempt - 1);
}

function toOpenFdaError(error: unknown) {
  if (error instanceof OpenFdaError) {
    return error;
  }

  if (error instanceof Error && error.name === "AbortError") {
    return new OpenFdaError("The openFDA request timed out.", {
      code: "TIMEOUT",
      retryable: true,
      cause: error,
    });
  }

  return new OpenFdaError("The openFDA service could not be reached.", {
    code: "NETWORK_ERROR",
    retryable: true,
    cause: error,
  });
}

export function createOpenFdaClient(options: OpenFdaClientOptions = {}) {
  const baseUrl = options.baseUrl ?? OPENFDA_BASE_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const fetcher = options.fetcher ?? fetch;
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const logger = options.logger ?? defaultLogger;

  async function request<T>(
    endpoint: OpenFdaEndpoint,
    params: QueryParams,
    schema: ZodType<T>,
  ): Promise<T> {
    const publicParams = safeParams(params);
    const url = new URL(endpoint, baseUrl);
    const apiKey = configuredApiKey();
    if (apiKey) {
      url.searchParams.set("api_key", apiKey);
    }
    for (const [key, value] of Object.entries(publicParams)) {
      url.searchParams.set(key, String(value));
    }

    for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const startedAt = Date.now();
      let response: Response | undefined;

      try {
        response = await fetcher(url, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
          cache: "no-store",
        });

        const rawBody = await response.text();
        let payload: unknown;
        try {
          payload = rawBody ? JSON.parse(rawBody) : null;
        } catch (error) {
          throw new OpenFdaError("openFDA returned invalid JSON.", {
            code: "INVALID_RESPONSE",
            status: response.status,
            retryable: TRANSIENT_STATUS_CODES.has(response.status),
            cause: error,
          });
        }

        if (!response.ok) {
          const notFound = response.status === 404;
          throw new OpenFdaError(
            notFound
              ? "No matching openFDA records were found."
              : errorMessageFromPayload(payload) ??
                  `openFDA returned HTTP ${response.status}.`,
            {
              code: notFound ? "NOT_FOUND" : "HTTP_ERROR",
              status: response.status,
              retryable: TRANSIENT_STATUS_CODES.has(response.status),
            },
          );
        }

        const parsed = schema.safeParse(payload);
        if (!parsed.success) {
          throw new OpenFdaError("openFDA returned an unexpected response shape.", {
            code: "INVALID_RESPONSE",
            status: response.status,
            cause: parsed.error,
          });
        }

        await writeLog(logger, {
          endpoint,
          params: publicParams,
          attempt,
          statusCode: response.status,
          durationMs: Date.now() - startedAt,
          outcome: "success",
          ...logRetentionDates(),
        });

        return parsed.data;
      } catch (error) {
        const openFdaError = toOpenFdaError(error);
        await writeLog(logger, {
          endpoint,
          params: publicParams,
          attempt,
          statusCode: response?.status,
          durationMs: Date.now() - startedAt,
          outcome: "error",
          errorCode: openFdaError.code,
          errorMessage: openFdaError.message,
          ...logRetentionDates(),
        });

        if (!openFdaError.retryable || attempt > retries) {
          throw openFdaError;
        }

        await sleep(retryDelay(response, attempt));
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new OpenFdaError("The openFDA request failed.", {
      code: "REQUEST_FAILED",
    });
  }

  return { request };
}

const defaultClient = createOpenFdaClient();

async function requestCount(params: QueryParams) {
  return defaultClient.request(
    "/drug/event.json",
    params,
    countResponseSchema,
  );
}

async function countOrZero(search: string) {
  try {
    const response = await requestCount({ search, count: "serious" });
    return parseTotal(response);
  } catch (error) {
    if (error instanceof OpenFdaError && error.code === "NOT_FOUND") {
      return 0;
    }
    throw error;
  }
}

export async function getTopReactions(
  drugName: string,
  limit = 20,
): Promise<CountItem[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error("Reaction limit must be an integer from 1 to 1000.");
  }

  const response = await requestCount({
    search: buildDrugEventSearch(drugName),
    count: "patient.reaction.reactionmeddrapt.exact",
    limit,
  });

  return parseCountItems(response).slice(0, limit);
}

export type SeriousnessCounts = {
  total: number;
  serious: number;
  nonSerious: number;
  unknown: number;
};

export async function getSeriousnessCounts(
  drugName: string,
): Promise<SeriousnessCounts> {
  const response = await requestCount({
    search: buildDrugEventSearch(drugName),
    count: "serious",
  });
  const items = parseCountItems(response);
  const count = (term: string) =>
    items.find((item) => item.term === term)?.count ?? 0;
  const total = parseTotal(response);
  const serious = count("1");
  const nonSerious = count("2");

  return {
    total,
    serious,
    nonSerious,
    unknown: Math.max(total - serious - nonSerious, 0),
  };
}

const SERIOUSNESS_FIELDS = {
  death: "seriousnessdeath",
  lifeThreatening: "seriousnesslifethreatening",
  hospitalization: "seriousnesshospitalization",
  disability: "seriousnessdisabling",
  congenitalAnomaly: "seriousnesscongenitalanomali",
  otherSerious: "seriousnessother",
} as const;

export type SeriousnessBreakdown = Record<
  keyof typeof SERIOUSNESS_FIELDS,
  number
>;

export async function getSeriousnessBreakdown(
  drugName: string,
): Promise<SeriousnessBreakdown> {
  const search = buildDrugEventSearch(drugName);
  const entries = await Promise.all(
    Object.entries(SERIOUSNESS_FIELDS).map(async ([key, field]) => [
      key,
      await countOrZero(withSearchClause(search, `${field}:"1"`)),
    ]),
  );

  return Object.fromEntries(entries) as SeriousnessBreakdown;
}

export type YearlyReportCount = { year: number; count: number };

export async function getYearlyTrend(
  drugName: string,
  fromYear: number,
  toYear: number,
): Promise<YearlyReportCount[]> {
  const currentYear = new Date().getUTCFullYear();
  if (
    !Number.isInteger(fromYear) ||
    !Number.isInteger(toYear) ||
    fromYear < 2004 ||
    toYear > currentYear ||
    fromYear > toYear ||
    toYear - fromYear > 30
  ) {
    throw new Error(
      `Year range must be ordered, no wider than 31 years, and between 2004 and ${currentYear}.`,
    );
  }

  const search = buildDrugEventSearch(drugName);
  const years = Array.from(
    { length: toYear - fromYear + 1 },
    (_, index) => fromYear + index,
  );
  const result: YearlyReportCount[] = [];

  for (let index = 0; index < years.length; index += 6) {
    const batch = years.slice(index, index + 6);
    const counts = await Promise.all(
      batch.map(async (year) => ({
        year,
        count: await countOrZero(
          withSearchClause(search, receivedDateClause(year)),
        ),
      })),
    );
    result.push(...counts);
  }

  return result;
}

export async function getDrugLabel(drugName: string): Promise<DrugLabel | null> {
  try {
    const response = await defaultClient.request(
      "/drug/label.json",
      {
        search: buildDrugLabelSearch(drugName),
        sort: "effective_time:desc",
        limit: 1,
      },
      labelResponseSchema,
    );

    return parseDrugLabel(response);
  } catch (error) {
    if (error instanceof OpenFdaError && error.code === "NOT_FOUND") {
      return null;
    }
    throw error;
  }
}

export type { CountItem, DrugLabel, OpenFdaCountResponse };
