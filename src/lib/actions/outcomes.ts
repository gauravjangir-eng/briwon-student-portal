"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { internshipSchema, placementSchema } from "@/lib/validation";
import { academyInputToIso } from "@/lib/utils";
import { dbError, ok, parseForm, type ActionResult } from "./result";

type Prev = ActionResult | null;

export async function approveCertificate(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ enrollment_id: z.guid(), completion_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_certificate", { p_enrollment: parsed.data.enrollment_id, p_completion_date: parsed.data.completion_date });
  if (error) return dbError(error);
  revalidatePath("/admin/certificates");
  return ok("Certificate approved and issued. The student has been notified.");
}

export async function revokeCertificate(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ id: z.guid(), reason: z.string().min(5, "Give a reason") }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_certificate", { p_certificate: parsed.data.id, p_reason: parsed.data.reason });
  if (error) return dbError(error);
  revalidatePath("/admin/certificates");
  return ok("Certificate revoked. The verification page now shows it as revoked.");
}

export async function saveInternship(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(internshipSchema, formData);
  if (parsed.error) return parsed.error;
  const { id, ...v } = parsed.data;
  const supabase = await createClient();
  const payload = { ...v, organization: v.organization ?? null, end_date: v.end_date ?? null, mentor_id: v.mentor_id ?? null };
  const { error } = id ? await supabase.from("internships").update(payload).eq("id", id) : await supabase.from("internships").insert(payload);
  if (error) return dbError(error);
  revalidatePath("/academics/internships");
  return ok(id ? "Internship updated." : "Internship created.");
}

export async function savePlacement(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await requireRole("admin");
  const parsed = parseForm(placementSchema, formData);
  if (parsed.error) return parsed.error;
  const { id, ...v } = parsed.data;
  const supabase = await createClient();
  const payload = { ...v, applied_on: v.applied_on ?? null, offer_details: v.offer_details ?? null, outcome: v.outcome ?? null, notes: v.notes ?? null };
  const { error } = id ? await supabase.from("placements").update(payload).eq("id", id) : await supabase.from("placements").insert({ ...payload, created_by: user.id });
  if (error) return dbError(error);
  revalidatePath("/admin/placements");
  return ok(id ? "Placement updated. The student has been notified of status changes." : "Placement record created.");
}

export async function saveInterview(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({
    id: z.guid().optional(), placement_id: z.guid(), round_number: z.coerce.number().int().min(1).max(20), round_name: z.string().min(2).max(100),
    scheduled_at: z.string().optional(), status: z.enum(["scheduled", "completed", "passed", "failed", "cancelled"]), feedback: z.string().max(2000).optional(),
  }), formData);
  if (parsed.error) return parsed.error;
  const { id, ...v } = parsed.data;
  const supabase = await createClient();
  const payload = { ...v, scheduled_at: v.scheduled_at ? academyInputToIso(v.scheduled_at) : null, feedback: v.feedback ?? null };
  const { error } = id ? await supabase.from("placement_interviews").update(payload).eq("id", id) : await supabase.from("placement_interviews").insert(payload);
  if (error) return dbError(error);
  revalidatePath("/admin/placements");
  return ok("Interview round saved.");
}
