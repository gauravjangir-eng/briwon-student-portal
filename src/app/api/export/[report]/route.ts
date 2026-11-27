import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { searchTerm } from "@/lib/queries";
import { toCsv, todayInAcademy } from "@/lib/utils";

type Row = Record<string, unknown>;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(request: NextRequest, { params }: { params: Promise<{ report: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const { report } = await params;
  const sp = request.nextUrl.searchParams;
  const batch = UUID.test(sp.get("batch") ?? "") ? sp.get("batch")! : null;
  const from = ISO_DAY.test(sp.get("from") ?? "") ? new Date(`${sp.get("from")}T00:00:00+05:30`).toISOString() : null;
  const to = ISO_DAY.test(sp.get("to") ?? "") ? new Date(`${sp.get("to")}T23:59:59+05:30`).toISOString() : null;
  const supabase = await createClient();
  let rows: Row[] = [];

  switch (report) {
    case "students": {
      let q = supabase.from("students").select("student_code, full_name, email, phone, status, admission_date, archived_at, enrollments(status, batch_id, batches(code), courses(name))").order("student_code");
      const t = searchTerm(sp.get("q") ?? undefined);
      if (t) q = q.or(`full_name.ilike.%${t}%,email.ilike.%${t}%,student_code.ilike.%${t}%`);
      if (sp.get("status")) q = q.eq("status", sp.get("status")!);
      const { data } = await q;
      rows = (data ?? []).filter((s) => !batch || s.enrollments.some((e) => e.batch_id === batch)).map((s) => {
        const e = s.enrollments.find((x) => x.status === "active") ?? s.enrollments[0];
        return { student_id: s.student_code, name: s.full_name, email: s.email, phone: s.phone, status: s.status, admission_date: s.admission_date, course: e?.courses?.name, batch: e?.batches?.code, archived: s.archived_at ? "yes" : "no" };
      });
      break;
    }
    case "attendance": {
      let q = supabase.from("attendance").select("status, source, check_in_at, distance_m, students(student_code, full_name), class_sessions!inner(starts_at, title, batch_id, batches(code))").order("created_at").limit(20000);
      if (batch) q = q.eq("class_sessions.batch_id", batch);
      if (from) q = q.gte("class_sessions.starts_at", from);
      if (to) q = q.lte("class_sessions.starts_at", to);
      const { data } = await q;
      rows = (data ?? []).map((a) => ({ session_start: a.class_sessions.starts_at, batch: a.class_sessions.batches?.code, session: a.class_sessions.title, student_id: a.students?.student_code, name: a.students?.full_name, status: a.status, source: a.source, check_in_at: a.check_in_at, distance_m: a.distance_m }));
      break;
    }
    case "attendance-summary": {
      let q = supabase.from("enrollments").select("student_id, batch_id, students(student_code, full_name), batches(code)").eq("status", "active");
      if (batch) q = q.eq("batch_id", batch);
      const { data } = await q;
      rows = await Promise.all((data ?? []).map(async (e) => {
        const { data: s } = await supabase.rpc("attendance_summary", { p_student: e.student_id, p_batch: e.batch_id });
        const m = s as { total: number; present: number; late: number; absent: number; excused: number; pct: number } | null;
        return { student_id: e.students?.student_code, name: e.students?.full_name, batch: e.batches?.code, classes: m?.total, present: m?.present, late: m?.late, absent: m?.absent, excused: m?.excused, attendance_pct: m?.pct };
      }));
      break;
    }
    case "submissions": {
      let q = supabase.from("submissions").select("status, submitted_at, first_submitted_at, original_deadline, is_late, attempt, marks, reviewed_at, students(student_code, full_name), assignments!inner(title, max_marks, batch_id, batches(code))").limit(20000);
      if (batch) q = q.eq("assignments.batch_id", batch);
      if (from) q = q.gte("submitted_at", from);
      if (to) q = q.lte("submitted_at", to);
      const { data } = await q;
      rows = (data ?? []).map((s) => ({ batch: s.assignments.batches?.code, assignment: s.assignments.title, student_id: s.students?.student_code, name: s.students?.full_name, deadline: s.original_deadline, first_submitted_at: s.first_submitted_at, last_submitted_at: s.submitted_at, late: s.is_late ? "yes" : "no", attempt: s.attempt, marks: s.marks, max_marks: s.assignments.max_marks, status: s.status, reviewed_at: s.reviewed_at }));
      break;
    }
    case "fees": {
      let q = supabase.from("fees").select("total_amount, amount_paid, waived_amount, waiver_reason, status, due_date, students(student_code, full_name), enrollments!inner(batch_id, batches(code), courses(name))");
      if (batch) q = q.eq("enrollments.batch_id", batch);
      const { data } = await q;
      rows = (data ?? []).map((f) => ({ student_id: f.students?.student_code, name: f.students?.full_name, course: f.enrollments.courses?.name, batch: f.enrollments.batches?.code, total: f.total_amount, paid: f.amount_paid, waived: f.waived_amount, balance: Math.max(0, Number(f.total_amount) - Number(f.amount_paid) - Number(f.waived_amount)), status: f.status, due_date: f.due_date, waiver_reason: f.waiver_reason }));
      break;
    }
    case "payments": {
      let q = supabase.from("payment_records").select("receipt_number, paid_on, amount, method, reference_number, is_void, void_reason, fees(students(student_code, full_name))").order("paid_on");
      if (sp.get("from")) q = q.gte("paid_on", sp.get("from")!);
      if (sp.get("to")) q = q.lte("paid_on", sp.get("to")!);
      const { data } = await q;
      rows = (data ?? []).map((p) => ({ receipt: p.receipt_number, paid_on: p.paid_on, student_id: p.fees?.students?.student_code, name: p.fees?.students?.full_name, amount: p.amount, method: p.method, reference: p.reference_number, void: p.is_void ? "yes" : "no", void_reason: p.void_reason }));
      break;
    }
    case "certificates": {
      const { data } = await supabase.from("certificates").select("certificate_number, status, grade, overall_pct, completion_date, approved_at, students(student_code, full_name), courses(name)").order("approved_at");
      rows = (data ?? []).map((c) => ({ certificate_number: c.certificate_number, student_id: c.students?.student_code, name: c.students?.full_name, course: c.courses?.name, grade: c.grade, overall_pct: c.overall_pct, completion_date: c.completion_date, status: c.status, approved_at: c.approved_at }));
      break;
    }
    case "placements": {
      const { data } = await supabase.from("placements").select("company, job_role, status, applied_on, outcome, updated_at, students(student_code, full_name)").order("updated_at");
      rows = (data ?? []).map((p) => ({ student_id: p.students?.student_code, name: p.students?.full_name, company: p.company, role: p.job_role, status: p.status, applied_on: p.applied_on, outcome: p.outcome, updated_at: p.updated_at }));
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }
  await supabase.rpc("log_action", { p_action: "export", p_entity: report, p_entity_id: "", p_details: { rows: rows.length } });
  const csv = "﻿" + (toCsv(rows) || "no records");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="briwon-${report}-${todayInAcademy()}.csv"`, "Cache-Control": "private, no-store" } });
}
