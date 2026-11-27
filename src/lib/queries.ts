import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/auth";

export type Supa = Awaited<ReturnType<typeof createClient>>;

export async function courseOptions(supabase: Supa, activeOnly = true) {
  let q = supabase.from("courses").select("id, code, name, fee_amount").order("name");
  if (activeOnly) q = q.eq("status", "active");
  const { data } = await q;
  return data ?? [];
}

/** Batches visible to the user. Trainers get only assigned batches. */
export async function batchOptions(supabase: Supa, user: CurrentUser) {
  if (user.role === "trainer") {
    const { data } = await supabase
      .from("batch_trainers")
      .select("batches(id, code, name, course_id, status, courses(name))")
      .eq("trainer_id", user.trainerId ?? "00000000-0000-0000-0000-000000000000");
    return (data ?? []).map((r) => r.batches).filter(Boolean).flat() as { id: string; code: string; name: string; course_id: string; status: string; courses: { name: string } | null }[];
  }
  const { data } = await supabase.from("batches").select("id, code, name, course_id, status, courses(name)").order("start_date", { ascending: false });
  return data ?? [];
}

export async function settings(supabase: Supa) {
  const { data } = await supabase.from("academy_settings").select("*").eq("id", 1).single();
  return data!;
}

export type Eligibility = {
  enrollment_id: string; student_id: string; eligible: boolean; grade: string; overall_pct: number;
  checks: { key: string; label: string; met: boolean; value?: number | null; detail: string }[];
  metrics: {
    attendance: { pct: number; total: number; present: number; late: number; absent: number; excused: number; unmarked: number };
    assignment_on_time_pct: number; required_assignments: number; assignment_avg_pct: number; mini_projects_submitted: number;
    capstone_pct: number | null; project_avg_pct: number; final_assessment_pct: number | null; fee_status: string | null; fee_balance: number;
  };
};

export async function eligibilityFor(supabase: Supa, enrollmentId: string) {
  const { data, error } = await supabase.rpc("certificate_eligibility", { p_enrollment: enrollmentId });
  if (error) return null;
  return data as unknown as Eligibility;
}

export type AttendanceSummary = { total: number; present: number; late: number; absent: number; excused: number; unmarked: number; pct: number; late_weight: number };

export async function attendanceSummary(supabase: Supa, studentId: string, batchId: string) {
  const { data } = await supabase.rpc("attendance_summary", { p_student: studentId, p_batch: batchId });
  return data as unknown as AttendanceSummary | null;
}

export function pageParams(sp: Record<string, string | undefined>, pageSize = 20) {
  const page = Math.max(1, Number(sp.page) || 1);
  return { page, pageSize, from: (page - 1) * pageSize, to: page * pageSize - 1 };
}

/** Escape user search text for PostgREST ilike/or filters */
export function searchTerm(q: string | undefined) {
  if (!q) return null;
  const t = q.replace(/[%_,()\\*:"']/g, " ").trim();
  return t ? t : null;
}
