import Link from "next/link";
import { CalendarCheck, ClipboardCheck, FileText, FolderKanban, Layers, Plane, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, InfoNote, PageHeader, StatCard } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime, todayInAcademy } from "@/lib/utils";

export const metadata = { title: "Trainer dashboard" };

export default async function TrainerDashboard() {
  const user = await requireRole("trainer");
  const supabase = await createClient();
  if (!user.trainerId) return <><PageHeader title="Welcome" /><InfoNote tone="amber">Your account is not linked to a trainer record yet. Please contact the academy admin.</InfoNote></>;
  const batches = await batchOptions(supabase, user);
  const ids = batches.map((b) => b.id).concat("00000000-0000-0000-0000-000000000000");
  const day = todayInAcademy();
  const [{ count: students }, { data: today }, { data: pendingSubs }, { data: pendingProjects }, { data: assessments }, { data: reports }, { data: att }] = await Promise.all([
    supabase.from("enrollments").select("id", { count: "exact", head: true }).in("batch_id", ids).eq("status", "active"),
    supabase.from("class_sessions").select("id, title, starts_at, ends_at, status, batches(code), attendance(count)").in("batch_id", ids)
      .gte("starts_at", new Date(`${day}T00:00:00+05:30`).toISOString()).lte("starts_at", new Date(`${day}T23:59:59+05:30`).toISOString()).order("starts_at"),
    supabase.from("submissions").select("id, submitted_at, students(full_name), assignments!inner(id, title, batch_id)").in("assignments.batch_id", ids).in("status", ["submitted", "late", "under_review"]).order("submitted_at").limit(8),
    supabase.from("project_submissions").select("id, projects!inner(id, title, batch_id)").in("projects.batch_id", ids).in("status", ["submitted", "under_review"]),
    supabase.from("assessments").select("id, title, assessment_date, batches(code)").in("batch_id", ids).gte("assessment_date", day).order("assessment_date").limit(5),
    supabase.from("internship_reports").select("id, week_number, internships!inner(id, mentor_id, students(full_name))").eq("internships.mentor_id", user.trainerId).eq("status", "submitted"),
    supabase.from("attendance").select("status, class_sessions!inner(batch_id, starts_at)").in("class_sessions.batch_id", ids).gte("class_sessions.starts_at", new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);
  const attended = (att ?? []).filter((a) => a.status === "present" || a.status === "late").length;
  const attRate = att?.length ? Math.round((attended * 100) / att.length) : 0;

  return (
    <>
      <PageHeader title={`Good day, ${user.fullName.split(" ")[0]}`} description="Your batches, classes and reviews at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active batches" value={batches.filter((b) => b.status === "active").length} hint={batches.map((b) => `${b.code}${b.status === "active" ? "" : ` (${b.status})`}`).join(", ") || "None"} icon={Layers} />
        <StatCard label="Assigned students" value={students ?? 0} icon={Users} tone="violet" href="/students" />
        <StatCard label="Attendance (30 days)" value={`${attRate}%`} icon={CalendarCheck} tone="green" href="/academics/sessions?when=past" />
        <StatCard label="Pending reviews" value={(pendingSubs?.length ?? 0) + (pendingProjects?.length ?? 0) + (reports?.length ?? 0)} hint={`${pendingSubs?.length ?? 0} assignments · ${pendingProjects?.length ?? 0} projects · ${reports?.length ?? 0} reports`} icon={ClipboardCheck} tone="amber" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Today's sessions" action={<Link href="/academics/sessions" className="text-sm font-medium text-brand-600 hover:underline">All sessions</Link>} />
          <CardBody className="space-y-2">
            {!today?.length && <p className="text-sm text-muted">No classes today.</p>}
            {today?.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                <div><p className="font-medium">{s.batches?.code} · {s.title}</p><p className="text-xs text-muted">{formatTime(s.starts_at)}–{formatTime(s.ends_at)} · {(s.attendance as unknown as { count: number }[])[0]?.count ?? 0} marked</p></div>
                <div className="flex items-center gap-2"><StatusBadge status={s.status} /><Button asChild size="sm"><Link href={`/academics/sessions/${s.id}`}>Attendance</Link></Button></div>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Assignments awaiting review" action={<Link href="/academics/assignments" className="text-sm font-medium text-brand-600 hover:underline">All</Link>} />
          {!pendingSubs?.length ? <EmptyState icon={ClipboardCheck} title="All caught up" /> : (
            <CardBody className="space-y-2">
              {pendingSubs.map((s) => (
                <Link key={s.id} href={`/academics/assignments/${s.assignments.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-line p-3 text-sm hover:bg-brand-50/50">
                  <span><span className="font-medium">{s.students?.full_name}</span><span className="block text-xs text-muted">{s.assignments.title}</span></span><span className="text-xs text-muted">{formatDate(s.submitted_at)}</span>
                </Link>
              ))}
            </CardBody>
          )}
        </Card>
        <Card>
          <CardHeader title="Upcoming assessments" />
          <CardBody className="space-y-2">
            {!assessments?.length && <p className="text-sm text-muted">None scheduled.</p>}
            {assessments?.map((a) => <Link key={a.id} href={`/academics/assessments/${a.id}`} className="flex items-center justify-between rounded-xl border border-line p-3 text-sm hover:bg-brand-50/50"><span className="flex items-center gap-2"><FileText className="size-4 text-brand-500" />{a.title} · {a.batches?.code}</span><span className="text-xs">{formatDate(a.assessment_date)}</span></Link>)}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Projects & internship reports" />
          <CardBody className="space-y-2 text-sm">
            <Link href="/academics/projects" className="flex items-center justify-between rounded-xl border border-line p-3 hover:bg-brand-50/50"><span className="flex items-center gap-2"><FolderKanban className="size-4 text-brand-500" /> Project submissions to review</span><b>{pendingProjects?.length ?? 0}</b></Link>
            {reports?.map((r) => <Link key={r.id} href={`/academics/internships/${r.internships.id}`} className="flex items-center justify-between rounded-xl border border-line p-3 hover:bg-brand-50/50"><span className="flex items-center gap-2"><Plane className="size-4 text-brand-500" /> {r.internships.students?.full_name}</span><span className="text-xs">Week {r.week_number}</span></Link>)}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
