import type { z } from "zod";

export type ActionResult = { ok: boolean; message?: string; errors?: Record<string, string[] | undefined>; data?: Record<string, unknown> };

export const ok = (message: string, data?: Record<string, unknown>): ActionResult => ({ ok: true, message, data });
export const fail = (message: string, errors?: ActionResult["errors"]): ActionResult => ({ ok: false, message, errors });

/** Parse FormData with a zod schema. Empty strings become undefined. */
export function parseForm<T extends z.ZodType>(schema: T, formData: FormData): { data: z.infer<T>; error?: undefined } | { data?: undefined; error: ActionResult } {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("$ACTION")) continue;
    const val = typeof v === "string" ? (v.trim() === "" ? undefined : v.trim()) : v;
    if (k.endsWith("[]")) {
      const key = k.slice(0, -2);
      raw[key] = [...((raw[key] as unknown[]) ?? []), val].filter((x) => x !== undefined);
    } else raw[k] = val;
  }
  const res = schema.safeParse(raw);
  if (!res.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of res.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (errors[key] ??= []).push(issue.message);
    }
    return { error: fail("Please fix the highlighted fields.", errors) };
  }
  return { data: res.data };
}

/** Turn a Postgres / Supabase error into a safe, readable message. */
export function dbError(error: { message?: string; code?: string } | null | undefined, fallback = "Something went wrong. Please try again."): ActionResult {
  if (!error) return fail(fallback);
  if (error.code === "23505") return fail("This record already exists (duplicate).");
  if (error.code === "42501") return fail(error.message?.includes("row-level security") ? "You do not have permission to do that." : error.message || "Not allowed.");
  if (error.code === "23503") return fail("This record is linked to other records and cannot be changed that way.");
  if (error.code === "23514") return fail("Some values are outside the allowed range.");
  // Messages raised deliberately by our SQL functions (P0001) are user-friendly.
  if (error.code === "P0001" && error.message) return fail(error.message);
  console.error("[db]", error);
  return fail(fallback);
}
