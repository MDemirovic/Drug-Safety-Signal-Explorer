import "server-only";

import { z } from "zod";

const RXNORM_BASE_URL = "https://rxnav.nlm.nih.gov/REST";
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_RETRIES = 1;
const TRANSIENT_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const rxcuiResponseSchema = z.object({
  idGroup: z
    .object({
      rxnormId: z.array(z.string()).nullish(),
    })
    .nullish(),
});

const propertiesResponseSchema = z.object({
  properties: z
    .object({
      rxcui: z.string(),
      name: z.string(),
      tty: z.string().optional(),
    })
    .nullish(),
});

const approximateResponseSchema = z.object({
  approximateGroup: z
    .object({
      candidate: z
        .array(
          z.object({
            rxcui: z.string(),
            name: z.string().optional(),
            rank: z.string().optional(),
            score: z.string().optional(),
            source: z.string().optional(),
          }),
        )
        .nullish(),
    })
    .nullish(),
});

export type RxNormMatch = {
  rxcui: string;
  name: string;
};

export type RxNormLookupClient = {
  lookup(name: string): Promise<RxNormMatch | null>;
};

export type RxNormClientOptions = {
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
  fetcher?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
};

class RxNormRequestError extends Error {
  readonly retryable: boolean;

  constructor(message: string, options?: { retryable?: boolean; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "RxNormRequestError";
    this.retryable = options?.retryable ?? false;
  }
}

function asRequestError(error: unknown) {
  if (error instanceof RxNormRequestError) {
    return error;
  }

  if (error instanceof Error && error.name === "AbortError") {
    return new RxNormRequestError("The RxNorm request timed out.", {
      retryable: true,
      cause: error,
    });
  }

  return new RxNormRequestError("The RxNorm service could not be reached.", {
    retryable: true,
    cause: error,
  });
}

export function createRxNormClient(
  options: RxNormClientOptions = {},
): RxNormLookupClient {
  const baseUrl = options.baseUrl ?? RXNORM_BASE_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const fetcher = options.fetcher ?? fetch;
  const sleep =
    options.sleep ??
    ((milliseconds) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  async function request<T>(
    path: string,
    params: Record<string, string>,
    schema: z.ZodType<T>,
  ): Promise<T | null> {
    const url = new URL(`${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetcher(url, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
          cache: "no-store",
        });

        if (response.status === 404) {
          return null;
        }

        if (!response.ok) {
          throw new RxNormRequestError(
            `RxNorm returned HTTP ${response.status}.`,
            { retryable: TRANSIENT_STATUS_CODES.has(response.status) },
          );
        }

        const parsed = schema.safeParse(await response.json());
        if (!parsed.success) {
          throw new RxNormRequestError(
            "RxNorm returned an unexpected response shape.",
            { cause: parsed.error },
          );
        }

        return parsed.data;
      } catch (error) {
        const requestError = asRequestError(error);
        if (!requestError.retryable || attempt === retries) {
          throw requestError;
        }

        await sleep(300 * 2 ** attempt);
      } finally {
        clearTimeout(timeout);
      }
    }

    return null;
  }

  async function getProperties(rxcui: string) {
    const response = await request(
      `rxcui/${encodeURIComponent(rxcui)}/properties.json`,
      {},
      propertiesResponseSchema,
    );
    const properties = response?.properties;

    if (!properties?.name.trim()) {
      return null;
    }

    return { rxcui: properties.rxcui, name: properties.name.trim() };
  }

  return {
    async lookup(name: string) {
      const exactOrNormalized = await request(
        "rxcui.json",
        { name, search: "2", allsrc: "0" },
        rxcuiResponseSchema,
      );
      const exactRxcui = exactOrNormalized?.idGroup?.rxnormId?.[0];

      if (exactRxcui) {
        return getProperties(exactRxcui);
      }

      const approximate = await request(
        "approximateTerm.json",
        { term: name, maxEntries: "1", option: "1" },
        approximateResponseSchema,
      );
      const candidate = approximate?.approximateGroup?.candidate?.find(
        (item) => item.rxcui && (item.source === "RXNORM" || item.name),
      );

      if (!candidate) {
        return null;
      }

      return (
        (await getProperties(candidate.rxcui)) ??
        (candidate.name?.trim()
          ? { rxcui: candidate.rxcui, name: candidate.name.trim() }
          : null)
      );
    },
  };
}

