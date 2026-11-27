"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { academyInputToIso, academyLocalToIso } from "@/lib/utils";
import { assessmentSchema, assignmentSchema, projectSchema, reviewSchema, sessionSchema } from "@/lib/validation";
import { getFile, uploadFile } from "@/lib/storage";
import { dbError, fail, ok, parseForm, type ActionResult } from "./result";

type Prev = ActionResult | null;
/** RPC params may be SQL NULL even when the generated types say otherwise. */
const nul = <T,>(v: T | undefined) => (v ?? null) as T;
const staff = () => requireRole("admin", "trainer");

// ---------- Sessions ----------
export async function saveSession(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await staff();
  const parsed = parseForm(sessionSchema, formData);
  if (parsed.error) return parsed.error;
  const v = parsed.data;
  const supabase = await createClient();
  const payload = {
    batch_id: v.batch_id, module_id: v.module_id ?? null, title: v.title, location: v.location ?? null,
    starts_at: academyLocalToIso(v.date, v.start_time), ends_at: academyLocalToIso(v.date, v.end_time),
    ...(v.id ? {} : { trainer_id: user.trainerId }),
  };
  const { error } = v.id ? await supabase.from("class_sessions").update(payload).eq("id", v.id) : await supabase.from("class_sessions").insert(payload);
  if (error) return dbError(error);
  revalidatePath("/academics/sessions");
  return ok(v.id ? "Session updated. Students are notified of time changes." : "Session scheduled.");
}

export async function setSessionStatus(_: Prev, formData: FormData): Promise<ActionResult> {
  await staff();
  const parsed = parseForm(z.object({ id: z.guid(), status: z.enum(["scheduled", "completed", "cancelled"]) }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.from("class_sessions").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) return dbError(error);
  revalidatePath(`/academics/sessions/${parsed.data.id}`);
  return ok(parsed.data.status === "cancelled" ? "Session cancelled. Students have been notified." : "Session updated.");
}

export async function markAttendance(_: Prev, formData: FormData): Promise<ActionResult> {
  await staff();
  const session = z.guid().safeParse(formData.get("session_id"));
  if (!session.success) return fail("Invalid session.");
  const entries: { student_id: string; status: string }[] = [];
  for (const [k, v] of formData.entries()) {
    const m = k.match(/^status:([0-9a-f-]{36})$/);
    if (m && typeof v === "string" && ["present", "late", "absent", "excused"].includes(v)) entries.push({ student_id: m[1]!, status: v });
  }
  if (!entries.length) return fail("Mark at least one student.");
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_mark_attendance", { p_session: session.data, p_entries: entries, p_reason: nul(reason) });
  if (error) return dbError(error);
  revalidatePath(`/academics/sessions/${session.data}`);
  return ok(`Attendance saved for ${data} student(s).`);
}

export async function reviewCorrection(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ id: z.guid(), approve: z.enum(["true", "false"]), note: z.string().max(500).optional() }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_attendance_correction", { p_request: parsed.data.id, p_approve: parsed.data.approve === "true", p_note: nul(parsed.data.note) });
  if (error) return dbError(error);
  revalidatePath("/admin/attendance");
  return ok(parsed.data.approve === "true" ? "Correction approved and applied." : "Correction rejected.");
}

export async function staffRequestCorrection(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await staff();
  const parsed = parseForm(z.object({ session_id: z.guid(), student_id: z.guid(), requested_status: z.enum(["present", "late", "absent", "excused"]), reason: z.string().min(5, "Explain the correction") }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.from("attendance_correction_requests").insert({ ...parsed.data, requested_by: user.id });
  if (error) return error.code === "23505" ? fail("A correction for this student and session is already pending.") : dbError(error);
  revalidatePath(`/academics/sessions/${parsed.data.session_id}`);
  return ok("Correction request sent to the admin for approval.");
}

export async function reviewLeave(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await staff();
  const parsed = parseForm(z.object({ id: z.guid(), status: z.enum(["approved", "rejected"]), note: z.string().max(500).optional() }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { data, error } = await supabase.from("leave_requests").update({ status: parsed.data.status, review_note: parsed.data.note ?? null, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", parsed.data.id).eq("status", "pending").select("id");
  if (error) return dbError(error);
  if (!data?.length) return fail("This request was already reviewed or you cannot review it.");
  revalidatePath("/academics/leave");
  revalidatePath("/admin/attendance");
  return ok(`Leave request ${parsed.data.status}.`);
}

// ---------- Assignments ----------
export async function saveAssignment(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await staff();
  const parsed = parseForm(assignmentSchema, formData);
  if (parsed.error) return parsed.error;
  const { id, deadline, ...v } = parsed.data;
  const supabase = await createClient();
  const { data: batch } = await supabase.from("batches").select("course_id").eq("id", v.batch_id).single();
  if (!batch) return fail("Batch not found.");
  const attachment = getFile(formData, "attachment");
  let attachmentPaths: string[] | undefined;
  if (attachment) {
    const up = await uploadFile(supabase, "course-files", v.batch_id, attachment);
    if ("error" in up) return fail(up.error!, { attachment: [up.error!] });
    attachmentPaths = [up.path!];
  }
  const payload = {
    ...v, module_id: v.module_id ?? null, description: v.description ?? null, instructions: v.instructions ?? null,
    deadline: academyInputToIso(deadline), course_id: batch.course_id,
    ...(attachmentPaths ? { attachment_paths: attachmentPaths } : {}),
  };
  const { data, error } = id
    ? await supabase.from("assignments").update(payload).eq("id", id).select("id").single()
    : await supabase.from("assignments").insert({ ...payload, created_by: user.id }).select("id").single();
  if (error) return dbError(error);
  revalidatePath("/academics/assignments");
  return ok(id ? "Assignment updated." : v.status === "published" ? "Assignment published. Students have been notified." : "Draft saved.", { id: data.id });
}

export async function reviewSubmission(_: Prev, formData: FormData): Promise<ActionResult> {
  await staff();
  const parsed = parseForm(reviewSchema, formData);
  if (parsed.error) return parsed.error;
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_submission", { p_submission: v.id, p_decision: v.decision, p_marks: nul(v.marks), p_feedback: nul(v.feedback) });
  if (error) return dbError(error);
  revalidatePath("/academics/assignments");
  return ok(v.decision === "approved" ? "Submission approved and feedback sent." : v.decision === "revision_required" ? "Revision requested. The student can resubmit." : "Marked as under review.");
}

// ---------- Projects ----------
export async function saveProject(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await staff();
  const parsed = parseForm(projectSchema, formData);
  if (parsed.error) return parsed.error;
  const { id, deadline, ...v } = parsed.data;
  const supabase = await createClient();
  const payload = { ...v, instructions: v.instructions ?? null, deadline: academyInputToIso(deadline) };
  const { error } = id ? await supabase.from("projects").update(payload).eq("id", id) : await supabase.from("projects").insert({ ...payload, created_by: user.id });
  if (error) return error.code === "23505" ? fail("This batch already has a project with that type and number.", { sequence: ["Already used"] }) : dbError(error);
  revalidatePath("/academics/projects");
  return ok(id ? "Project updated." : "Project created.");
}

export async function reviewProject(_: Prev, formData: FormData): Promise<ActionResult> {
  await staff();
  const parsed = parseForm(reviewSchema.extend({ presentation_status: z.enum(["not_required", "pending", "scheduled", "completed"]).optional(), presentation_at: z.string().optional() }), formData);
  if (parsed.error) return parsed.error;
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_project", {
    p_submission: v.id, p_decision: v.decision, p_marks: nul(v.marks), p_feedback: nul(v.feedback),
    p_presentation_status: v.presentation_status, p_presentation_at: v.presentation_at ? academyInputToIso(v.presentation_at) : undefined,
  });
  if (error) return dbError(error);
  revalidatePath("/academics/projects");
  return ok("Project review saved.");
}

// ---------- Assessments ----------
export async function saveAssessment(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await staff();
  const parsed = parseForm(assessmentSchema, formData);
  if (parsed.error) return parsed.error;
  const { id, ...v } = parsed.data;
  const supabase = await createClient();
  const { error } = id ? await supabase.from("assessments").update(v).eq("id", id) : await supabase.from("assessments").insert({ ...v, trainer_id: user.trainerId });
  if (error) return dbError(error);
  revalidatePath("/academics/assessments");
  return ok(id ? "Assessment updated." : "Assessment scheduled.");
}

export async function saveResults(_: Prev, formData: FormData): Promise<ActionResult> {
  await staff();
  const assessment = z.guid().safeParse(formData.get("assessment_id"));
  if (!assessment.success) return fail("Invalid assessment.");
  const supabase = await createClient();
  let saved = 0;
  for (const [k, v] of formData.entries()) {
    const m = k.match(/^score:([0-9a-f-]{36})$/);
    if (!m || typeof v !== "string" || v.trim() === "") continue;
    const score = Number(v);
    if (!Number.isFinite(score) || score < 0) return fail("Scores must be positive numbers.");
    const feedback = String(formData.get(`feedback:${m[1]}`) ?? "").trim() || undefined;
    const { error } = await supabase.rpc("record_assessment_result", { p_assessment: assessment.data, p_student: m[1]!, p_score: score, p_feedback: nul(feedback) });
    if (error) return dbError(error);
    saved++;
  }
  revalidatePath(`/academics/assessments/${assessment.data}`);
  return saved ? ok(`${saved} result(s) saved and students notified.`) : fail("Enter at least one score.");
}

// ---------- Internships (mentor side) ----------
export async function reviewInternshipReport(_: Prev, formData: FormData): Promise<ActionResult> {
  await staff();
  const parsed = parseForm(z.object({ id: z.guid(), status: z.enum(["approved", "revision_required"]), mentor_comment: z.string().max(2000).optional() }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { data, error } = await supabase.from("internship_reports").update({ status: parsed.data.status, mentor_comment: parsed.data.mentor_comment ?? null }).eq("id", parsed.data.id).select("id");
  if (error) return dbError(error);
  if (!data?.length) return fail("You cannot review this report.");
  revalidatePath("/academics/internships");
  return ok("Report reviewed and the student was notified.");
}

export async function updateInternshipProgress(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await staff();
  const parsed = parseForm(z.object({
    id: z.guid(), progress_pct: z.coerce.number().int().min(0).max(100), status: z.enum(["planned", "ongoing", "completed", "terminated"]),
    feedback: z.string().max(2000).optional(), completion_status: z.enum(["in_progress", "approved", "not_approved"]),
  }), formData);
  if (parsed.error) return parsed.error;
  const v = parsed.data;
  const supabase = await createClient();
  const approved = v.completion_status !== "in_progress";
  const { data, error } = await supabase.from("internships").update({
    progress_pct: v.progress_pct, status: v.status, feedback: v.feedback ?? null, completion_status: v.completion_status,
    ...(approved ? { approved_by: user.id, approved_at: new Date().toISOString() } : {}),
  }).eq("id", v.id).select("id");
  if (error) return dbError(error);
  if (!data?.length) return fail("You cannot update this internship.");
  revalidatePath(`/academics/internships/${v.id}`);
  return ok("Internship updated.");
}

export async function saveInternshipTask(_: Prev, formData: FormData): Promise<ActionResult> {
  await staff();
  const parsed = parseForm(z.object({ id: z.guid().optional(), internship_id: z.guid(), title: z.string().min(2).max(150), description: z.string().max(1000).optional(), due_date: z.string().optional(), status: z.enum(["todo", "in_progress", "done"]).default("todo") }), formData);
  if (parsed.error) return parsed.error;
  const { id, ...v } = parsed.data;
  const supabase = await createClient();
  const payload = { ...v, due_date: v.due_date || null, description: v.description ?? null };
  const { error } = id ? await supabase.from("internship_tasks").update(payload).eq("id", id) : await supabase.from("internship_tasks").insert(payload);
  if (error) return dbError(error);
  revalidatePath(`/academics/internships/${v.internship_id}`);
  return ok("Task saved.");
}
