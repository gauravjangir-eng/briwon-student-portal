"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { studentSelfSchema } from "@/lib/validation";
import { getFile, uploadFile } from "@/lib/storage";
import { dbError, fail, ok, parseForm, type ActionResult } from "./result";

type Prev = ActionResult | null;
const nul = <T,>(v: T | undefined) => (v ?? null) as T;

export async function checkIn(sessionId: string, coords: { lat: number; lng: number; accuracy: number }): Promise<ActionResult> {
  await requireStudent();
  const parsed = z.object({ sessionId: z.uuid(), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), accuracy: z.number().min(0).max(100000) })
    .safeParse({ sessionId, ...coords });
  if (!parsed.success) return fail("We could not read your location. Please try again.");
  const supabase = await createClient();
  // Time and distance are evaluated on the server (database), never trusted from the device.
  const { data, error } = await supabase.rpc("student_check_in", { p_session: sessionId, p_lat: coords.lat, p_lng: coords.lng, p_accuracy: coords.accuracy });
  if (error) return dbError(error);
  const r = data as { ok: boolean; message: string; status?: string };
  revalidatePath("/student/timetable");
  revalidatePath("/student");
  return r.ok ? ok(r.message, { status: r.status }) : fail(r.message);
}

export async function submitAssignment(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await requireStudent();
  const parsed = parseForm(z.object({ assignment_id: z.uuid(), content_text: z.string().max(20000).optional(), external_url: z.url("Enter a full link starting with https://").optional() }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  let filePath: string | undefined;
  const file = getFile(formData);
  if (file) {
    const up = await uploadFile(supabase, "student-files", `${user.studentId}/submissions/${parsed.data.assignment_id}`, file);
    if ("error" in up) return fail(up.error!, { file: [up.error!] });
    filePath = up.path;
  }
  const { data, error } = await supabase.rpc("submit_assignment", {
    p_assignment: parsed.data.assignment_id, p_text: nul(parsed.data.content_text), p_file_path: nul(filePath), p_url: nul(parsed.data.external_url),
  });
  if (error) return dbError(error);
  const r = data as { is_late: boolean; attempt: number };
  revalidatePath(`/student/assignments/${parsed.data.assignment_id}`);
  return ok(r.is_late ? "Submitted (late). Your trainer has been informed by the submission status." : `Submitted${r.attempt > 1 ? ` (attempt ${r.attempt})` : ""}. Good work!`);
}

export async function submitProject(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await requireStudent();
  const parsed = parseForm(z.object({ project_id: z.uuid(), project_url: z.url("Enter a full link starting with https://").optional(), notes: z.string().max(2000).optional() }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  let filePath: string | undefined;
  const file = getFile(formData);
  if (file) {
    const up = await uploadFile(supabase, "student-files", `${user.studentId}/projects/${parsed.data.project_id}`, file);
    if ("error" in up) return fail(up.error!, { file: [up.error!] });
    filePath = up.path;
  }
  const { error } = await supabase.rpc("submit_project", { p_project: parsed.data.project_id, p_file_path: nul(filePath), p_url: nul(parsed.data.project_url), p_notes: nul(parsed.data.notes) });
  if (error) return dbError(error);
  revalidatePath("/student/projects");
  return ok("Project submitted.");
}

export async function requestCorrection(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await requireStudent();
  const parsed = parseForm(z.object({ session_id: z.uuid(), requested_status: z.enum(["present", "late", "excused"]), reason: z.string().min(5, "Explain what happened").max(1000) }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.from("attendance_correction_requests").insert({ ...parsed.data, student_id: user.studentId, requested_by: user.id });
  if (error) return error.code === "23505" ? fail("You already have a pending request for this session.") : dbError(error);
  revalidatePath("/student/attendance");
  return ok("Correction request sent. An admin will review it.");
}

export async function requestLeave(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await requireStudent();
  const parsed = parseForm(z.object({ start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"), end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"), reason: z.string().min(5, "Give a reason").max(1000) })
    .refine((v) => v.end_date >= v.start_date, { message: "End date must be on or after the start date", path: ["end_date"] }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.from("leave_requests").insert({ ...parsed.data, student_id: user.studentId });
  if (error) return dbError(error);
  revalidatePath("/student/attendance");
  return ok("Leave request submitted.");
}

export async function updateMyProfile(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await requireStudent();
  const parsed = parseForm(studentSelfSchema, formData);
  if (parsed.error) return parsed.error;
  const v = parsed.data;
  const supabase = await createClient();
  const update: { phone: string; address: string | null; emergency_contact_name: string | null; emergency_contact_phone: string | null; skills: string[]; portfolio_url: string | null; resume_path?: string } = {
    phone: v.phone, address: v.address ?? null, emergency_contact_name: v.emergency_contact_name ?? null, emergency_contact_phone: v.emergency_contact_phone ?? null,
    skills: (v.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30), portfolio_url: v.portfolio_url ?? null,
  };
  const resume = getFile(formData, "resume");
  if (resume) {
    const up = await uploadFile(supabase, "student-files", `${user.studentId}/resume`, resume, ["pdf", "doc", "docx"]);
    if ("error" in up) return fail(up.error!, { resume: [up.error!] });
    update.resume_path = up.path!;
  }
  const { error } = await supabase.from("students").update(update).eq("id", user.studentId);
  if (error) return dbError(error);
  revalidatePath("/student/profile");
  return ok("Profile updated.");
}

export async function submitInternshipReport(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await requireStudent();
  const parsed = parseForm(z.object({ internship_id: z.uuid(), week_number: z.coerce.number().int().min(1).max(104), summary: z.string().min(10, "Write at least a few sentences").max(5000), hours_worked: z.coerce.number().min(0).max(168).optional() }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  let filePath: string | null = null;
  const file = getFile(formData);
  if (file) {
    const up = await uploadFile(supabase, "student-files", `${user.studentId}/internship`, file);
    if ("error" in up) return fail(up.error!, { file: [up.error!] });
    filePath = up.path!;
  }
  const v = parsed.data;
  const { data: existing } = await supabase.from("internship_reports").select("id, status").eq("internship_id", v.internship_id).eq("week_number", v.week_number).maybeSingle();
  if (existing?.status === "approved") return fail(`Week ${v.week_number} is already approved.`);
  const payload = { internship_id: v.internship_id, week_number: v.week_number, summary: v.summary, hours_worked: v.hours_worked ?? null, ...(filePath ? { file_path: filePath } : {}) };
  const { error } = existing ? await supabase.from("internship_reports").update(payload).eq("id", existing.id) : await supabase.from("internship_reports").insert(payload);
  if (error) return dbError(error);
  revalidatePath("/student/internship");
  return ok(existing ? `Week ${v.week_number} report updated.` : `Week ${v.week_number} report submitted.`);
}
