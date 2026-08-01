import "server-only";

const MAX_DRUG_NAME_LENGTH = 120;

function cleanDrugName(drugName: string) {
  const cleaned = drugName.trim().replace(/\s+/g, " ");

  if (!cleaned) {
    throw new Error("A drug name is required.");
  }

  if (cleaned.length > MAX_DRUG_NAME_LENGTH) {
    throw new Error(
      `Drug names must be ${MAX_DRUG_NAME_LENGTH} characters or fewer.`,
    );
  }

  if (/\p{Cc}/u.test(cleaned)) {
    throw new Error("Drug names cannot contain control characters.");
  }

  return cleaned;
}

function quotedTerm(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function buildDrugEventSearch(drugName: string) {
  const term = quotedTerm(cleanDrugName(drugName));

  return [
    "(",
    `patient.drug.openfda.generic_name:${term}`,
    " OR ",
    `patient.drug.openfda.brand_name:${term}`,
    " OR ",
    `patient.drug.medicinalproduct:${term}`,
    ")",
  ].join("");
}

export function buildDrugLabelSearch(drugName: string) {
  const term = quotedTerm(cleanDrugName(drugName));

  return [
    "(",
    `openfda.generic_name:${term}`,
    " OR ",
    `openfda.brand_name:${term}`,
    ")",
  ].join("");
}

export function withSearchClause(search: string, clause: string) {
  return `${search} AND ${clause}`;
}

export function receivedDateClause(year: number) {
  return `receivedate:[${year}0101 TO ${year}1231]`;
}
