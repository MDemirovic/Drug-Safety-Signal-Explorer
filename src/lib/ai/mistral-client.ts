import "server-only";

import { z } from "zod";

import type { AiSummaryContent } from "@/types/ai-summary";

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
export const DEFAULT_MISTRAL_MODEL = "mistral-small-latest";

const observationCodeSchema = z.enum([
  "report_volume",
  "reaction_terms",
  "seriousness_classification",
  "yearly_pattern",
  "label_context",
  "reaction_overlap",
]);
const selectionSchema = z.object({
  overview: z.literal("grounded_snapshot"),
  keyObservations: z.array(observationCodeSchema).min(2).max(5).refine((items) => new Set(items).size === items.length),
  limitations: z.literal("faers_standard"),
});
const responseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.union([
          z.string(),
          z.array(z.object({ type: z.string(), text: z.string().optional() })),
        ]),
      }),
    }),
  ).min(1),
});

export const SAFE_AI_OVERVIEW = "This AI-selected overview identifies evidence categories present in the supplied aggregate snapshot.";
export const SAFE_AI_OBSERVATIONS = {
  report_volume: "The supplied data include aggregate counts of matching reports.",
  reaction_terms: "The supplied data include ranked reported reaction terms; frequency does not establish a drug-reaction relationship.",
  seriousness_classification: "The supplied data include seriousness classifications recorded in source reports.",
  yearly_pattern: "The supplied data include report counts grouped by calendar year.",
  label_context: "The supplied data include limited FDA labeling context where a matching label was available.",
  reaction_overlap: "The supplied comparison includes overlap and differences among ranked reported reaction terms.",
} as const;
export const STANDARD_FAERS_LIMITATIONS = "FAERS spontaneous reports are subject to reporting bias and do not prove causation.";
const allowedObservations = new Set<string>(Object.values(SAFE_AI_OBSERVATIONS));

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function populatedArray(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

export function allowedObservationCodes(snapshot: unknown) {
  const source = record(snapshot);
  const allowed = new Set<z.infer<typeof observationCodeSchema>>();
  if (!source) return allowed;
  const drug = record(source.drug);
  const drugA = record(source.drugA);
  const drugB = record(source.drugB);
  if ((drug && typeof drug.totalReports === "number") || (drugA && drugB)) allowed.add("report_volume");
  if (populatedArray(source.topReactions) || populatedArray(source.uniqueReactionsA) || populatedArray(source.uniqueReactionsB)) allowed.add("reaction_terms");
  if (record(source.seriousnessBreakdown) || (drugA && drugB && typeof drugA.seriousReports === "number" && typeof drugB.seriousReports === "number")) allowed.add("seriousness_classification");
  if (populatedArray(source.yearlyTrend)) allowed.add("yearly_pattern");
  if (record(source.labelContext)) allowed.add("label_context");
  if (populatedArray(source.overlappingReactions)) allowed.add("reaction_overlap");
  return allowed;
}

export function assertSummaryPolicy(summary: AiSummaryContent) {
  const valid = summary.overview === SAFE_AI_OVERVIEW
    && summary.limitations === STANDARD_FAERS_LIMITATIONS
    && summary.keyObservations.length >= 2
    && summary.keyObservations.length <= 5
    && new Set(summary.keyObservations).size === summary.keyObservations.length
    && summary.keyObservations.every((observation) => allowedObservations.has(observation));
  if (!valid) throw new MistralSummaryError("Mistral returned content outside the approved summary policy.");
}

export function assertSummaryGrounding(summary: AiSummaryContent, snapshot: unknown) {
  assertSummaryPolicy(summary);
  const grounded = new Set<string>([...allowedObservationCodes(snapshot)].map((code) => SAFE_AI_OBSERVATIONS[code]));
  if (!summary.keyObservations.every((observation) => grounded.has(observation))) {
    throw new MistralSummaryError("Mistral selected an observation absent from the supplied snapshot.");
  }
}

function materializeSummary(selection: z.infer<typeof selectionSchema>): AiSummaryContent {
  return {
    overview: SAFE_AI_OVERVIEW,
    keyObservations: selection.keyObservations.map((code) => SAFE_AI_OBSERVATIONS[code]),
    limitations: STANDARD_FAERS_LIMITATIONS,
  };
}

export class MistralSummaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MistralSummaryError";
  }
}

export type MistralSummaryClient = {
  model: string;
  summarize(subjectJson: string): Promise<AiSummaryContent>;
};

export function createMistralSummaryClient(options: {
  apiKey?: string;
  model?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
} = {}): MistralSummaryClient {
  const apiKey = options.apiKey ?? process.env.MISTRAL_API_KEY;
  const model = options.model ?? DEFAULT_MISTRAL_MODEL;
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 20_000;

  return {
    model,
    async summarize(subjectJson) {
      if (!apiKey) throw new MistralSummaryError("MISTRAL_API_KEY is not configured.");
      let subject: unknown;
      try {
        subject = JSON.parse(subjectJson);
      } catch {
        throw new MistralSummaryError("The supplied summary snapshot is invalid.");
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetcher(MISTRAL_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.1,
            max_tokens: 650,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "Inspect only the JSON supplied by the user and select 2-5 applicable evidence-category codes. Do not add facts or prose. Return JSON exactly as: overview='grounded_snapshot'; keyObservations is a unique array chosen only from report_volume, reaction_terms, seriousness_classification, yearly_pattern, label_context, reaction_overlap; limitations='faers_standard'. The server maps faers_standard to the fixed caveat that FAERS spontaneous reports have reporting bias and do not prove causation. Never provide causality, incidence, risk, comparative safety, diagnosis, treatment, dosing, or medical advice.",
              },
              { role: "user", content: subjectJson },
            ],
          }),
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new MistralSummaryError(`Mistral returned HTTP ${response.status}.`);
        const parsedResponse = responseSchema.safeParse(await response.json());
        if (!parsedResponse.success) throw new MistralSummaryError("Mistral returned an unexpected response.");
        const content = parsedResponse.data.choices[0].message.content;
        const text = typeof content === "string"
          ? content
          : content.map((chunk) => chunk.text ?? "").join("");
        const parsedSelection = selectionSchema.safeParse(JSON.parse(text));
        if (!parsedSelection.success) throw new MistralSummaryError("Mistral returned an invalid summary selection.");
        const summary = materializeSummary(parsedSelection.data);
        assertSummaryGrounding(summary, subject);
        return summary;
      } catch (error) {
        if (error instanceof MistralSummaryError) throw error;
        throw new MistralSummaryError("The AI summary service is temporarily unavailable.");
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
