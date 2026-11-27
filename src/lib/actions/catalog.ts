"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchSchema, courseSchema, moduleSchema } from "@/lib/validation";
import { dbError, fail, ok, parseForm, type ActionResult } from "./result";

type Prev = ActionResult | null;

export async function saveCourse(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(courseSchema, formData);
  if (parsed.error) return parsed.error;
  const { id, ...v } = parsed.data;
  const supabase = await createClient();
  const payload = { ...v, description: v.description ?? null, requirements: v.requirements ?? null };
  const { data, error } = id
    ? await supabase.from("courses").update(payload).eq("id", id).select("id").single()
    : await supabase.from("courses").insert(payload).select("id").single();
  if (error) return dbError(error);
  revalidatePath("/admin/courses");
  return ok(id ? "Course updated." : "Course created.", { id: data.id });
}

export async function saveModule(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(moduleSchema, formData);
  if (parsed.error) return parsed.error;
  const { id, ...v } = parsed.data;
  const supabase = await createClient();
  const { error } = id ? await supabase.from("modules").update(v).eq("id", id) : await supabase.from("modules").insert(v);
  if (error) return error.code === "23505" ? fail("Another module already uses that position.", { position: ["Already used"] }) : dbError(error);
  revalidatePath(`/admin/courses/${v.course_id}`);
  return ok(id ? "Module updated." : "Module added.");
}

export async function deleteModule(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ id: z.uuid(), course_id: z.uuid() }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.from("modules").delete().eq("id", parsed.data.id);
  if (error) return dbError(error);
  revalidatePath(`/admin/courses/${parsed.data.course_id}`);
  return ok("Module removed.");
}

export async function moveModule(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ id: z.uuid(), course_id: z.uuid(), dir: z.enum(["up", "down"]) }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { data: mods } = await supabase.from("modules").select("id, position").eq("course_id", parsed.data.course_id).order("position");
  const list = mods ?? [];
  const i = list.findIndex((m) => m.id === parsed.data.id);
  const j = parsed.data.dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return ok("Already at the edge.");
  // Swap via a temporary position (unique constraint is deferrable, but PostgREST runs one statement per call)
  const a = list[i]!, b = list[j]!;
  await supabase.from("modules").update({ position: 9999 }).eq("id", a.id);
  await supabase.from("modules").update({ position: a.position }).eq("id", b.id);
  const { error } = await supabase.from("modules").update({ position: b.position }).eq("id", a.id);
  if (error) return dbError(error);
  revalidatePath(`/admin/courses/${parsed.data.course_id}`);
  return ok("Module order updated.");
}

export async function saveBatch(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(batchSchema, formData);
  if (parsed.error) return parsed.error;
  const { id, ...v } = parsed.data;
  const supabase = await createClient();
  const payload = { ...v, location: v.location ?? null };
  const { data, error } = id
    ? await supabase.from("batches").update(payload).eq("id", id).select("id").single()
    : await supabase.from("batches").insert(payload).select("id").single();
  if (error) return dbError(error);
  revalidatePath("/admin/batches");
  return ok(id ? "Batch updated." : "Batch created.", { id: data.id });
}

export async function assignTrainer(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ batch_id: z.uuid(), trainer_id: z.uuid(), is_primary: z.string().optional() }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.from("batch_trainers").insert({ batch_id: parsed.data.batch_id, trainer_id: parsed.data.trainer_id, is_primary: parsed.data.is_primary === "on" });
  if (error) return dbError(error);
  revalidatePath(`/admin/batches/${parsed.data.batch_id}`);
  return ok("Trainer assigned.");
}

export async function removeTrainer(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ batch_id: z.uuid(), trainer_id: z.uuid() }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.from("batch_trainers").delete().eq("batch_id", parsed.data.batch_id).eq("trainer_id", parsed.data.trainer_id);
  if (error) return dbError(error);
  revalidatePath(`/admin/batches/${parsed.data.batch_id}`);
  return ok("Trainer removed from batch.");
}

export async function generateSessions(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ batch_id: z.uuid(), from: z.string().optional(), to: z.string().optional() }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_batch_sessions", { p_batch: parsed.data.batch_id, p_from: parsed.data.from, p_to: parsed.data.to });
  if (error) return dbError(error);
  revalidatePath(`/admin/batches/${parsed.data.batch_id}`);
  return ok(`${data} session(s) added to the timetable.`);
}

export async function enrollStudent(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ student_id: z.uuid(), batch_id: z.uuid(), fee_amount: z.coerce.number().min(0), fee_due: z.string().optional() }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.rpc("enroll_student", { p_student: parsed.data.student_id, p_batch: parsed.data.batch_id, p_fee_amount: parsed.data.fee_amount, p_fee_due: parsed.data.fee_due });
  if (error) return error.code === "23505" ? fail("The student already has an active enrollment in this course.") : dbError(error);
  revalidatePath(`/students/${parsed.data.student_id}`);
  return ok("Student enrolled.");
}

export async function transferStudent(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ enrollment_id: z.uuid(), student_id: z.uuid(), batch_id: z.uuid(), reason: z.string().min(5, "Give a reason (5+ characters)") }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_student", { p_enrollment: parsed.data.enrollment_id, p_new_batch: parsed.data.batch_id, p_reason: parsed.data.reason });
  if (error) return dbError(error);
  revalidatePath(`/students/${parsed.data.student_id}`);
  return ok("Batch transfer completed. The previous enrollment is kept in history.");
}

export async function setEnrollmentStatus(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = parseForm(z.object({ id: z.uuid(), student_id: z.uuid(), status: z.enum(["withdrawn", "active"]) }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.from("enrollments").update({ status: parsed.data.status, ended_on: parsed.data.status === "withdrawn" ? new Date().toISOString().slice(0, 10) : null }).eq("id", parsed.data.id);
  if (error) return dbError(error);
  revalidatePath(`/students/${parsed.data.student_id}`);
  return ok(parsed.data.status === "withdrawn" ? "Enrollment withdrawn." : "Enrollment re-activated.");
}
