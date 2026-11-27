"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { leadActivitySchema, leadSchema, leadStatusSchema } from "@/lib/validation";
import { dbError, fail, ok, parseForm, type ActionResult } from "./result";

type Prev = ActionResult | null;

export async function saveLead(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(leadSchema, formData);
  if (parsed.error) return parsed.error;
  const { id, ...v } = parsed.data;
  const supabase = await createClient();
  const payload = {
    full_name: v.full_name, phone: v.phone, email: v.email ?? null, city: v.city ?? null, course_id: v.course_id ?? null,
    source: v.source, next_follow_up: v.next_follow_up ?? null, notes: v.notes ?? null,
  };
  if (!id) {
    // Warn about likely duplicates instead of silently creating a second record.
    const { data: dupe } = await supabase.from("leads").select("id, full_name").eq("phone", v.phone).not("status", "in", "(converted,lost)").maybeSingle();
    if (dupe) return fail(`An open enquiry with this phone already exists (${dupe.full_name}).`, { phone: ["Already an open enquiry"] });
  }
  const { data, error } = id
    ? await supabase.from("leads").update(payload).eq("id", id).select("id").single()
    : await supabase.from("leads").insert(payload).select("id").single();
  if (error) return dbError(error);
  revalidatePath("/admin/leads");
  if (id) revalidatePath(`/admin/leads/${id}`);
  return ok(id ? "Enquiry updated." : "Enquiry added.", { id: data.id });
}

export async function updateLeadStatus(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(leadStatusSchema, formData);
  if (parsed.error) return parsed.error;
  const v = parsed.data;
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("status").eq("id", v.id).single();
  if (!lead) return fail("Enquiry not found.");
  if (lead.status === "converted") return fail("This enquiry is already an admitted student.");
  const { error } = await supabase.from("leads").update({
    status: v.status,
    next_follow_up: v.status === "lost" ? null : v.next_follow_up ?? null,
    lost_reason: v.status === "lost" ? v.lost_reason! : null,
  }).eq("id", v.id);
  if (error) return dbError(error);
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${v.id}`);
  return ok("Status updated.");
}

export async function addLeadActivity(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await requireRole("admin");
  const parsed = parseForm(leadActivitySchema, formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.from("lead_activities").insert({ ...parsed.data, created_by: user.id });
  if (error) return dbError(error);
  // A first call, message or visit moves a brand-new enquiry to "contacted".
  if (parsed.data.kind !== "note") await supabase.from("leads").update({ status: "contacted" }).eq("id", parsed.data.lead_id).eq("status", "new");
  revalidatePath(`/admin/leads/${parsed.data.lead_id}`);
  revalidatePath("/admin/leads");
  return ok("Activity added.");
}
