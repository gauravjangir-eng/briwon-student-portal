"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { admissionSchema, settingsSchema, studentUpdateSchema, trainerSchema } from "@/lib/validation";
import { uploadFile, getFile } from "@/lib/storage";
import { dbError, fail, ok, parseForm, type ActionResult } from "./result";

type Prev = ActionResult | null;
const id = z.object({ id: z.guid() });

export async function runDailyAlerts(): Promise<ActionResult> {
  await requireRole("admin");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("run_daily_alerts");
  if (error) return dbError(error);
  const r = data as Record<string, number>;
  return ok(`Sent ${r.attendance_warnings} attendance warning(s), ${r.deadline_reminders} deadline reminder(s) and ${r.low_performance} low-performance alert(s).`);
}

// ---------- Invitations ----------
async function sendInvite(email: string, fullName: string): Promise<ActionResult> {
  if (!hasServiceRoleKey()) return fail("Invitations need SUPABASE_SERVICE_ROLE_KEY on the server. The record was saved; send the invite once it is configured.");
  const supabase = await createClient();
  // Rate limit: max 30 invitations per admin per hour
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { data: me } = await supabase.auth.getUser();
  const { count } = await supabase.from("audit_logs").select("id", { count: "exact", head: true })
    .eq("action", "invite").eq("actor_id", me.user!.id).gte("created_at", since);
  if ((count ?? 0) >= 30) return fail("Invitation limit reached (30 per hour). Please try again later.");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${env.siteUrl}/auth/confirm?next=/set-password`,
  });
  if (error) {
    if (/already been registered|already exists/i.test(error.message)) return fail("This email already has a portal account.");
    console.error("[invite]", error);
    return fail("Could not send the invitation. Check the email settings in Supabase.");
  }
  await supabase.rpc("log_action", { p_action: "invite", p_entity: "auth_user", p_entity_id: email, p_details: {} });
  return ok(`Invitation sent to ${email}.`);
}

export async function inviteStudent(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(id, formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { data: s } = await supabase.from("students").select("email, full_name, profile_id").eq("id", parsed.data.id).single();
  if (!s) return fail("Student not found.");
  if (s.profile_id) return fail("This student already has an account.");
  const res = await sendInvite(s.email, s.full_name);
  if (res.ok) await supabase.from("students").update({ invited_at: new Date().toISOString() }).eq("id", parsed.data.id);
  revalidatePath(`/students/${parsed.data.id}`);
  return res;
}

export async function inviteTrainer(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(id, formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { data: t } = await supabase.from("trainers").select("email, full_name, profile_id").eq("id", parsed.data.id).single();
  if (!t) return fail("Trainer not found.");
  if (t.profile_id) return fail("This trainer already has an account.");
  return sendInvite(t.email, t.full_name);
}

// ---------- Admission ----------
export async function admitStudent(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(admissionSchema, formData);
  if (parsed.error) return parsed.error;
  const v = parsed.data;
  const supabase = await createClient();

  const { data: dupe } = await supabase.from("students").select("id").eq("email", v.email).maybeSingle();
  if (dupe) return fail("A student with this email already exists.", { email: ["Already registered"] });

  const { data, error } = await supabase.rpc("admit_student", {
    p_full_name: v.full_name, p_email: v.email, p_phone: v.phone, p_course: v.course_id, p_batch: v.batch_id,
    p_admission_date: v.admission_date, p_address: v.address ?? "", p_emergency_name: v.emergency_contact_name,
    p_emergency_phone: v.emergency_contact_phone, p_fee_amount: v.fee_amount, p_fee_due: v.fee_due ?? undefined,
    p_status: v.status, p_date_of_birth: v.date_of_birth ?? undefined,
  });
  if (error) return dbError(error);
  const result = data as { student_id: string; student_code: string };

  // Admission from an enquiry: mark the lead as converted and link it to the new student.
  if (v.lead_id) {
    await supabase.from("leads").update({ status: "converted", student_id: result.student_id, converted_at: new Date().toISOString(), next_follow_up: null })
      .eq("id", v.lead_id).neq("status", "converted");
    revalidatePath("/admin/leads");
  }

  // Optional documents uploaded with the admission form
  const docs: [string, string][] = [["doc_id_proof", "id_proof"], ["doc_photo", "photo"], ["doc_education", "education"], ["doc_admission_form", "admission_form"]];
  const { data: me } = await supabase.auth.getUser();
  const uploadErrors: string[] = [];
  for (const [field, type] of docs) {
    const file = getFile(formData, field);
    if (!file) continue;
    const up = await uploadFile(supabase, "student-files", `${result.student_id}/documents`, file, type === "photo" ? ["png", "jpg", "webp"] : undefined);
    if ("error" in up) { uploadErrors.push(`${type}: ${up.error}`); continue; }
    await supabase.from("student_documents").insert({
      student_id: result.student_id, doc_type: type, file_path: up.path!, file_name: file.name.slice(0, 200), mime_type: file.type, size_bytes: file.size, uploaded_by: me.user!.id,
    });
    if (type === "photo") await supabase.from("students").update({ photo_path: up.path }).eq("id", result.student_id);
  }

  let inviteMsg = "";
  if (v.send_invite === "on") {
    const inv = await sendInvite(v.email, v.full_name);
    inviteMsg = inv.ok ? " Invitation email sent." : ` Invite not sent: ${inv.message}`;
    if (inv.ok) await supabase.from("students").update({ invited_at: new Date().toISOString() }).eq("id", result.student_id);
  }
  revalidatePath("/students");
  return ok(`Admitted ${v.full_name} as ${result.student_code}.${inviteMsg}${uploadErrors.length ? ` Some documents failed: ${uploadErrors.join("; ")}` : ""}`, { studentId: result.student_id });
}

export async function updateStudent(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(studentUpdateSchema, formData);
  if (parsed.error) return parsed.error;
  const { id: sid, ...v } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("students").update({ ...v, date_of_birth: v.date_of_birth ?? null }).eq("id", sid);
  if (error) return dbError(error);
  revalidatePath(`/students/${sid}`);
  return ok("Student details saved.");
}

export async function setStudentArchived(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ id: z.guid(), archive: z.enum(["true", "false"]) }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const archive = parsed.data.archive === "true";
  const { error } = await supabase.from("students").update({ archived_at: archive ? new Date().toISOString() : null, ...(archive ? { status: "inactive" } : {}) }).eq("id", parsed.data.id);
  if (error) return dbError(error);
  revalidatePath("/students");
  return ok(archive ? "Student archived. All academic and financial history is kept." : "Student restored.");
}

export async function setAccountActive(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ profile_id: z.guid(), active: z.enum(["true", "false"]) }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_active: parsed.data.active === "true" }).eq("id", parsed.data.profile_id);
  if (error) return dbError(error);
  revalidatePath("/students");
  return ok(parsed.data.active === "true" ? "Portal access enabled." : "Portal access disabled.");
}

export async function uploadStudentDocument(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await requireRole("admin", "student");
  const parsed = parseForm(z.object({ student_id: z.guid(), doc_type: z.enum(["id_proof", "address_proof", "photo", "education", "admission_form", "other"]) }), formData);
  if (parsed.error) return parsed.error;
  if (user.role === "student" && user.studentId !== parsed.data.student_id) return fail("Not allowed.");
  const file = getFile(formData);
  if (!file) return fail("Choose a file to upload.", { file: ["Required"] });
  const supabase = await createClient();
  const up = await uploadFile(supabase, "student-files", `${parsed.data.student_id}/documents`, file, ["pdf", "png", "jpg", "webp"]);
  if ("error" in up) return fail(up.error!, { file: [up.error!] });
  const { error } = await supabase.from("student_documents").insert({
    student_id: parsed.data.student_id, doc_type: parsed.data.doc_type, file_path: up.path!, file_name: file.name.slice(0, 200),
    mime_type: file.type, size_bytes: file.size, uploaded_by: user.id,
  });
  if (error) return dbError(error);
  revalidatePath(`/students/${parsed.data.student_id}`);
  revalidatePath("/student/documents");
  return ok("Document uploaded.");
}

export async function verifyDocument(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(id, formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.from("student_documents").update({ verified: true }).eq("id", parsed.data.id);
  if (error) return dbError(error);
  revalidatePath("/students");
  return ok("Document marked as verified.");
}

// ---------- Trainers ----------
export async function saveTrainer(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(trainerSchema, formData);
  if (parsed.error) return parsed.error;
  const { id: tid, ...v } = parsed.data;
  const supabase = await createClient();
  const { error } = tid ? await supabase.from("trainers").update(v).eq("id", tid) : await supabase.from("trainers").insert(v);
  if (error) return dbError(error);
  revalidatePath("/admin/trainers");
  return ok(tid ? "Trainer updated." : `Trainer ${v.full_name} added. Send an invitation so they can sign in.`);
}

// ---------- Settings ----------
export async function saveSettings(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(settingsSchema, formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.from("academy_settings").update({
    ...parsed.data, support_email: parsed.data.support_email ?? null,
    campus_latitude: parsed.data.campus_latitude ?? null, campus_longitude: parsed.data.campus_longitude ?? null,
  }).eq("id", 1);
  if (error) return dbError(error);
  revalidatePath("/admin/settings");
  return ok("Settings saved. The previous version was kept in the policy history.");
}
