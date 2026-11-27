/**
 * Pure business rules. These mirror the authoritative SQL functions in
 * supabase/migrations/…_functions_triggers.sql and are used for UI previews
 * and unit tests. The database remains the source of truth.
 */

export type AttendanceStatus = "present" | "late" | "absent" | "excused";

export type AttendancePolicy = { presentUntilMin: number; lateUntilMin: number };

/** Minutes after start → status. Defaults: 0–14 present, 15–30 late, 31+ absent. */
export function attendanceStatusFor(minutesAfterStart: number, policy: AttendancePolicy = { presentUntilMin: 14, lateUntilMin: 30 }): Exclude<AttendanceStatus, "excused"> {
  if (minutesAfterStart <= policy.presentUntilMin) return "present";
  if (minutesAfterStart <= policy.lateUntilMin) return "late";
  return "absent";
}

/** Whole minutes elapsed between class start and check-in (floored, like the SQL). */
export function minutesAfter(start: Date, at: Date) {
  return Math.floor((at.getTime() - start.getTime()) / 60000);
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

export function attendancePercent(c: { present: number; late: number; total: number; excused: number }, lateWeight = 1) {
  const denom = c.total - c.excused;
  if (denom <= 0) return 0;
  return Math.round(((c.present + c.late * lateWeight) * 10000) / denom) / 100;
}

export type FeeStatus = "paid" | "partially_paid" | "pending" | "overdue" | "waived";

export function feeStatus(total: number, paid: number, waived: number, dueDate: string | null, today = new Date().toISOString().slice(0, 10)): FeeStatus {
  if (total - waived - paid <= 0) return waived > 0 ? "waived" : "paid";
  if (dueDate && dueDate < today) return "overdue";
  if (paid > 0) return "partially_paid";
  return "pending";
}

export type Grade = "Distinction" | "Merit" | "Pass" | "Not Yet Complete";

export type GradePolicy = { distinction: number; merit: number; pass: number };

export function gradeFor(overallPct: number, allRequirementsMet: boolean, p: GradePolicy = { distinction: 85, merit: 70, pass: 50 }): Grade {
  if (!allRequirementsMet) return "Not Yet Complete";
  if (overallPct >= p.distinction) return "Distinction";
  if (overallPct >= p.merit) return "Merit";
  if (overallPct >= p.pass) return "Pass";
  return "Not Yet Complete";
}

export type LatePolicy = "none" | "grace" | "always";

/** Whether a submission at `at` is accepted, and whether it counts as on time for eligibility. */
export function submissionWindow(deadline: Date, at: Date, policy: LatePolicy, graceDays = 7, lateWithinGraceCounts = true) {
  const late = at.getTime() > deadline.getTime();
  const withinGrace = at.getTime() <= deadline.getTime() + graceDays * 86400000;
  const accepted = !late || policy === "always" || (policy === "grace" && withinGrace);
  const countsOnTime = !late || (lateWithinGraceCounts && withinGrace);
  return { late, accepted, countsOnTime };
}
