import Link from "next/link";
import { Award, BookOpen, Briefcase, ClipboardCheck, Layers, Plane, UserCheck, Users, UserSquare2, Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard, Progress } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DonutChart, SimpleBarChart } from "@/components/charts";
import { formatCurrency, humanize } from "@/lib/utils";
import { RunAlertsButton } from "./run-alerts";

export const metadata = { title: "Admin dashboard" };

export default async function AdminDashboard() {
  await requireRole("admin");
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const head = { count: "exact" as const, head: true };

  const [students, active, trainers, courses, batches, pendingSubs, pendingProjects, certs, att, fees, placements, internships, assignments, subs, enrollments, corrections] = await Promise.all([
    supabase.from("students").select("id", head).is("archived_at", null),
    supabase.from("students").select("id", head).is("archived_at", null).eq("status", "active"),
    supabase.from("trainers").select("id", head).eq("status", "active"),
    supabase.from("courses").select("id", head).eq("status", "active"),
    supabase.from("batches").select("id", head).eq("status", "active"),
    supabase.from("submissions").select("id", head).in("status", ["submitted", "late", "under_review"]),
    supabase.from("project_submissions").select("id", head).in("status", ["submitted", "under_review"]),
    supabase.from("certificates").select("status"),
    supabase.from("attendance").select("status, class_sessions!inner(starts_at)").gte("class_sessions.starts_at", since),
    supabase.from("fees").select("total_amount, amount_paid, waived_amount, status"),
    supabase.from("placements").select("status"),
    supabase.from("internships").select("status"),
    supabase.from("assignments").select("id, batch_id").eq("status", "published").lt("deadline", new Date().toISOString()),
    supabase.from("submissions").select("assignment_id"),
    supabase.from("enrollments").select("batch_id").eq("status", "active"),
    supabase.from("attendance_correction_requests").select("id", head).eq("status", "pending"),
  ]);

  const count = <T extends { status: string }>(rows: T[] | null) =>
    (rows ?? []).reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});

  const attCounts = count(att.data);
  const attTotal = Object.values(attCounts).reduce((a, b) => a + b, 0);
  const attRate = attTotal ? Math.round((((attCounts.present ?? 0) + (attCounts.late ?? 0)) * 100) / attTotal) : 0;

  const feeRows = fees.data ?? [];
  const billed = feeRows.reduce((s, f) => s + Number(f.total_amount), 0);
  const collected = feeRows.reduce((s, f) => s + Number(f.amount_paid), 0);
  const waived = feeRows.reduce((s, f) => s + Number(f.waived_amount), 0);
  const outstanding = Math.max(0, billed - collected - waived);
  const feeCounts = count(feeRows);

  const perBatch = (enrollments.data ?? []).reduce<Record<string, number>>((m, e) => ((m[e.batch_id] = (m[e.batch_id] ?? 0) + 1), m), {});
  const subIds = new Set((assignments.data ?? []).map((a) => a.id));
  const expected = (assignments.data ?? []).reduce((s, a) => s + (perBatch[a.batch_id] ?? 0), 0);
  const submitted = (subs.data ?? []).filter((s) => subIds.has(s.assignment_id)).length;
  const completion = expected ? Math.round((submitted * 100) / expected) : 0;

  const placementCounts = count(placements.data);
  const internshipCounts = count(internships.data);
  const certCounts = count(certs.data);

  return (
    <>
      <PageHeader title="Academy overview" description="Live numbers across admissions, learning, fees and outcomes." actions={<RunAlertsButton />} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total students" value={students.count ?? 0} hint={`${active.count ?? 0} active`} icon={Users} href="/students" />
        <StatCard label="Active trainers" value={trainers.count ?? 0} icon={UserSquare2} tone="violet" href="/admin/trainers" />
        <StatCard label="Courses / batches" value={`${courses.count ?? 0} / ${batches.count ?? 0}`} hint="Active courses / running batches" icon={BookOpen} tone="green" href="/admin/batches" />
        <StatCard label="Pending reviews" value={(pendingSubs.count ?? 0) + (pendingProjects.count ?? 0)} hint={`${pendingSubs.count ?? 0} assignments · ${pendingProjects.count ?? 0} projects`} icon={ClipboardCheck} tone="amber" href="/academics/assignments" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Attendance (30 days)" description={`${attRate}% attended (present + late)`} />
          <CardBody>
            <DonutChart centerLabel={`${attRate}%`} data={[
              { label: "Present", value: attCounts.present ?? 0, color: "#10b981" },
              { label: "Late", value: attCounts.late ?? 0, color: "#f59e0b" },
              { label: "Absent", value: attCounts.absent ?? 0, color: "#ef4444" },
              { label: "Excused", value: attCounts.excused ?? 0, color: "#8b5cf6" },
            ]} />
            {!!corrections.count && <p className="mt-4 text-sm"><Link className="font-medium text-brand-600 hover:underline" href="/admin/attendance">{corrections.count} correction request(s) awaiting approval →</Link></p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Fee collection" description={`${formatCurrency(collected)} of ${formatCurrency(billed)} collected`} />
          <CardBody className="space-y-4">
            <Progress value={billed ? (collected * 100) / billed : 0} tone="green" />
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-muted">Collected</p><p className="font-semibold">{formatCurrency(collected)}</p></div>
              <div><p className="text-muted">Outstanding</p><p className="font-semibold text-red-600">{formatCurrency(outstanding)}</p></div>
              <div><p className="text-muted">Waived</p><p className="font-semibold">{formatCurrency(waived)}</p></div>
            </div>
            <SimpleBarChart height={150} data={["paid", "partially_paid", "pending", "overdue", "waived"].map((s) => ({ label: ({ partially_paid: "Partial" } as Record<string, string>)[s] ?? humanize(s), value: feeCounts[s] ?? 0 }))} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Assignment completion" description="Submissions for assignments past their deadline" />
          <CardBody className="space-y-4">
            <p className="font-display text-4xl font-bold">{completion}%</p>
            <Progress value={completion} />
            <p className="text-sm text-muted">{submitted} of {expected} expected submissions received.</p>
            <div className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
              <Link href="/admin/certificates" className="rounded-xl bg-brand-50 p-3 hover:bg-brand-100">
                <Award className="size-4 text-brand-600" /><p className="mt-2 text-muted">Certificates issued</p><p className="text-lg font-bold">{certCounts.approved ?? 0}</p>
              </Link>
              <Link href="/admin/fees?status=overdue" className="rounded-xl bg-red-50 p-3 hover:bg-red-100">
                <Wallet className="size-4 text-red-600" /><p className="mt-2 text-muted">Overdue fees</p><p className="text-lg font-bold">{feeCounts.overdue ?? 0}</p>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Placement overview" action={<Link href="/admin/placements" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>} />
          <CardBody>
            <SimpleBarChart data={["preparing", "applied", "interview_scheduled", "interviewing", "offer_received", "joined", "rejected"].map((s) => ({ label: ({ interview_scheduled: "Scheduled", offer_received: "Offer" } as Record<string, string>)[s] ?? humanize(s), value: placementCounts[s] ?? 0 }))} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Internship progress" action={<Link href="/academics/internships" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>} />
          <CardBody>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[["planned", Layers], ["ongoing", Plane], ["completed", UserCheck], ["terminated", Briefcase]].map(([s, Icon]) => {
                const I = Icon as typeof Plane;
                return (
                  <div key={s as string} className="rounded-xl border border-line p-4">
                    <I className="size-4 text-brand-500" />
                    <p className="mt-2 text-2xl font-bold">{internshipCounts[s as string] ?? 0}</p>
                    <p className="text-xs text-muted">{humanize(s as string)}</p>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
