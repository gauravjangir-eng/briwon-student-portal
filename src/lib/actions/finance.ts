"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { paymentSchema } from "@/lib/validation";
import { getFile, uploadFile } from "@/lib/storage";
import { dbError, fail, ok, parseForm, type ActionResult } from "./result";

type Prev = ActionResult | null;

export async function recordPayment(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await requireRole("admin");
  const parsed = parseForm(paymentSchema, formData);
  if (parsed.error) return parsed.error;
  const v = parsed.data;
  const supabase = await createClient();
  const { data: fee } = await supabase.from("fees").select("total_amount, amount_paid, waived_amount").eq("id", v.fee_id).single();
  if (!fee) return fail("Fee record not found.");
  const balance = Number(fee.total_amount) - Number(fee.amount_paid) - Number(fee.waived_amount);
  if (v.amount > balance + 0.001) return fail(`Amount is more than the remaining balance (₹${balance.toFixed(0)}).`, { amount: ["Exceeds balance"] });
  const { data, error } = await supabase.from("payment_records").insert({ ...v, reference_number: v.reference_number ?? null, notes: v.notes ?? null, recorded_by: user.id }).select("receipt_number").single();
  if (error) return dbError(error);
  revalidatePath(`/admin/fees/${v.fee_id}`);
  return ok(`Payment recorded. Receipt ${data.receipt_number}.`);
}

export async function voidPayment(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ id: z.guid(), fee_id: z.guid(), void_reason: z.string().min(5, "Give a reason") }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.from("payment_records").update({ is_void: true, void_reason: parsed.data.void_reason }).eq("id", parsed.data.id);
  if (error) return dbError(error);
  revalidatePath(`/admin/fees/${parsed.data.fee_id}`);
  return ok("Payment voided. It stays in the history but no longer counts.");
}

export async function applyWaiver(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ fee_id: z.guid(), waived_amount: z.coerce.number().min(0), waiver_reason: z.string().min(5, "Document the reason for the waiver").max(1000) }), formData);
  if (parsed.error) return parsed.error;
  const v = parsed.data;
  const supabase = await createClient();
  const { data: fee } = await supabase.from("fees").select("total_amount, amount_paid").eq("id", v.fee_id).single();
  if (!fee) return fail("Fee record not found.");
  if (v.waived_amount > Number(fee.total_amount) - Number(fee.amount_paid)) return fail("Waiver cannot exceed the unpaid amount.", { waived_amount: ["Too large"] });
  let docPath: string | undefined;
  const file = getFile(formData, "document");
  if (file) {
    const up = await uploadFile(supabase, "admin-files", `waivers/${v.fee_id}`, file, ["pdf", "png", "jpg"]);
    if ("error" in up) return fail(up.error!, { document: [up.error!] });
    docPath = up.path;
  }
  const { error } = await supabase.from("fees").update({ waived_amount: v.waived_amount, waiver_reason: v.waiver_reason, ...(docPath ? { waiver_document_path: docPath } : {}) }).eq("id", v.fee_id);
  if (error) return dbError(error);
  revalidatePath(`/admin/fees/${v.fee_id}`);
  return ok(v.waived_amount > 0 ? "Waiver applied and documented." : "Waiver removed.");
}

export async function updateFeeTerms(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ fee_id: z.guid(), total_amount: z.coerce.number().min(0).max(10_000_000), due_date: z.string().optional() }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.from("fees").update({ total_amount: parsed.data.total_amount, due_date: parsed.data.due_date || null }).eq("id", parsed.data.fee_id);
  if (error) return dbError(error);
  revalidatePath(`/admin/fees/${parsed.data.fee_id}`);
  return ok("Fee terms updated.");
}
