import "server-only";

import { z } from "zod";

const metaSchema = z.object({
  disclaimer: z.string().optional(),
  last_updated: z.string().optional(),
  results: z
    .object({
      skip: z.number().optional(),
      limit: z.number().optional(),
      total: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

const countItemSchema = z.object({
  term: z.union([z.string(), z.number()]),
  count: z.number().int().nonnegative(),
});

export const countResponseSchema = z.object({
  meta: metaSchema.optional(),
  results: z.array(countItemSchema),
});

const stringListSchema = z.array(z.string()).optional();

const labelRecordSchema = z
  .object({
    effective_time: z.string().optional(),
    set_id: z.string().optional(),
    boxed_warning: stringListSchema,
    warnings: stringListSchema,
    warnings_and_cautions: stringListSchema,
    adverse_reactions: stringListSchema,
    indications_and_usage: stringListSchema,
    openfda: z
      .object({
        brand_name: stringListSchema,
        generic_name: stringListSchema,
        manufacturer_name: stringListSchema,
        product_type: stringListSchema,
        route: stringListSchema,
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const labelResponseSchema = z.object({
  meta: metaSchema.optional(),
  results: z.array(labelRecordSchema),
});

export type OpenFdaCountResponse = z.infer<typeof countResponseSchema>;
export type OpenFdaLabelResponse = z.infer<typeof labelResponseSchema>;

export type CountItem = {
  term: string;
  count: number;
};

export type DrugLabel = {
  effectiveTime?: string;
  setId?: string;
  brandNames: string[];
  genericNames: string[];
  manufacturerNames: string[];
  productTypes: string[];
  routes: string[];
  boxedWarning: string[];
  warnings: string[];
  adverseReactions: string[];
  indicationsAndUsage: string[];
};

function uniqueStrings(values: string[] | undefined) {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function cleanSections(values: string[] | undefined) {
  return uniqueStrings(values).map((value) =>
    value.replace(/\s+/g, " ").trim(),
  );
}

export function parseCountItems(response: OpenFdaCountResponse): CountItem[] {
  return response.results.map((item) => ({
    term: String(item.term),
    count: item.count,
  }));
}

export function parseTotal(response: OpenFdaCountResponse) {
  return (
    response.meta?.results?.total ??
    response.results.reduce((total, item) => total + item.count, 0)
  );
}

export function parseDrugLabel(
  response: OpenFdaLabelResponse,
): DrugLabel | null {
  const record = response.results[0];

  if (!record) {
    return null;
  }

  return {
    effectiveTime: record.effective_time,
    setId: record.set_id,
    brandNames: uniqueStrings(record.openfda?.brand_name),
    genericNames: uniqueStrings(record.openfda?.generic_name),
    manufacturerNames: uniqueStrings(record.openfda?.manufacturer_name),
    productTypes: uniqueStrings(record.openfda?.product_type),
    routes: uniqueStrings(record.openfda?.route),
    boxedWarning: cleanSections(record.boxed_warning),
    warnings: cleanSections([
      ...(record.warnings ?? []),
      ...(record.warnings_and_cautions ?? []),
    ]),
    adverseReactions: cleanSections(record.adverse_reactions),
    indicationsAndUsage: cleanSections(record.indications_and_usage),
  };
}
