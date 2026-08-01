import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { OpenFdaError } from "@/lib/openfda/client";
import { RateLimitExceededError } from "@/lib/security/rate-limit";

const normalizedDrugNameSchema = z
  .string()
  .transform((value) => value.normalize("NFKC"))
  .refine((value) => !/\p{Cc}/u.test(value), {
    message: "Drug names cannot contain control characters.",
  })
  .transform((value) => value.trim().replace(/\s+/g, " "))
  .pipe(
    z.string().min(1).max(120),
  );

export const drugSearchSchema = z.object({ name: normalizedDrugNameSchema });

export const drugSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export function snapshotErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Please provide a valid drug name." },
      { status: 400 },
    );
  }

  if (error instanceof RateLimitExceededError) {
    return NextResponse.json(
      { error: "Too many new drug searches. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      },
    );
  }

  if (error instanceof OpenFdaError) {
    return NextResponse.json(
      {
        error:
          error.code === "NOT_FOUND"
            ? "No matching reported FAERS data was found for this drug."
            : "The openFDA service is temporarily unavailable.",
      },
      { status: error.code === "NOT_FOUND" ? 404 : 502 },
    );
  }

  console.error("Drug snapshot request failed.", error);
  return NextResponse.json(
    { error: "The drug snapshot could not be prepared right now." },
    { status: 503 },
  );
}
