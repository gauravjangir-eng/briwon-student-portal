import Link from "next/link";
import { CalendarCheck, ClipboardList, FolderKanban, GraduationCap, IdCard, Wallet } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { currentEnrollment, eligibilityFor } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, InfoNote, PageHeader, Progress, StatCard } from "@/components/ui/misc";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { GradeBadge } from "@/components/eligibility";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, formatTime, humanize, pct } from "@/lib/utils";

export const metadata = { title: "My dashboard" };

export default async function StudentDashboard() {
  const user = await requireStudent();
  const supabase = await createClient();
  const [{ data: me }, en] = await Promise.all([
    supabase.from("students").select("full_name, student_code, status").eq("id", user.studentId).single(),
    currentEnrollment(supabase, user.studentId),
  ]);
  if (!en) {
    return (<><PageHeader title={`Welcome, ${me?.full_name.split(" ")[0]}`} /><Card><EmptyState title="You are not enrolled in a course yet" description="Please contact the academy office." /></Card></>);
  }
  const now = new Date().toISOString();
  const [elig, { data: next }, { data: assignments }, { data: subs }, { data: feedback }, { data: fee }, { data: internship }, { data: placements }, { data: ann }] = await Promise.all([
    eligibilityFor(supabase, en.id),
    supabase.from("class_sessions").select("id, title, starts_at, ends_at, location, status").eq("batch_id", en.batch_id).gte("ends_at", now).neq("status", "cancelled").order("starts_at").limit(3),
    supabase.from("assignments").select("id, title, deadline, is_required").eq("batch_id", en.batch_id).eq("status", "published").order("deadline"),
    supabase.from("submissions").select("assignment_id, status, marks").eq("student_id", user.studentId),
    supabase.from("submissions").select("id, marks, feedback, reviewed_at, status, assignments(id, title, max_marks)").eq("student_id", user.studentId).not("reviewed_at", "is", null).order("reviewed_at", { ascending: false }).limit(3),
    supabase.from("fees").select("total_amount, amount_paid, waived_amount, status, due_date").eq("enrollment_id", en.id).maybeSingle(),
    supabase.from("internships").select("title, organization, progress_pct, status").eq("student_id", user.studentId).order("start_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.rpc("my_placements"),
    supabase.from("announcements").select("id, title, body, published_at").order("is_pinned", { ascending: false }).order("published_at", { ascending: false }).limit(2),
  ]);
  const submitted = new Set((subs ?? []).map((s) => s.assignment_id));
  const pending = (assignments ?? []).filter((a) => !submitted.has(a.id) && a.deadline > now);
  const doneCount = (assignments ?? []).filter((a) => submitted.has(a.id)).length;
  const balance = fee ? Math.max(0, Number(fee.total_amount) - Number(fee.amount_paid) - Number(fee.waived_amount)) : 0;
  const att = elig?.metrics.attendance.pct ?? 0;
  const placement = placements?.[0];

  return (
    <>
      <div className="brand-gradient relative mb-6 overflow-hidden rounded-2xl p-6 text-white sm:p-8">
        <div className="grid-pattern absolute inset-0" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-brand-200">Welcome back</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{me?.full_name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-brand-100">
              <span className="rounded-md bg-white/15 px-2 py-0.5 font-mono font-semibold text-white">{me?.student_code}</span>
              {en.courses?.name} · {en.batches?.code}
            </p>
          </div>
          <Button asChild variant="outline" className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/20"><Link href="/student/profile"><IdCard /> My ID card</Link></Button>
        </div>
      </div>

      {att > 0 && elig && att < 75 && elig.metrics.attendance.total >= 4 && <div className="mb-6"><InfoNote tone="amber">Your attendance is {pct(att, 1)}. You need at least 75% to be eligible for your certificate.</InfoNote></div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attendance" value={pct(att, 1)} hint={`${elig?.metrics.attendance.present ?? 0} present · ${elig?.metrics.attendance.late ?? 0} late · ${elig?.metrics.attendance.absent ?? 0} absent`} icon={CalendarCheck} tone={att >= 75 ? "green" : "amber"} href="/student/attendance" />
        <StatCard label="Assignments" value={`${doneCount}/${assignments?.length ?? 0}`} hint={`${pending.length} pending`} icon={ClipboardList} href="/student/assignments" />
        <StatCard label="Projects" value={`${elig?.metrics.mini_projects_submitted ?? 0}/4 mini`} hint={elig?.metrics.capstone_pct != null ? `Capstone ${elig.metrics.capstone_pct}/100` : "Capstone pending"} icon={FolderKanban} tone="violet" href="/student/projects" />
        <StatCard label="Fees" value={balance ? formatCurrency(balance) : "Cleared"} hint={fee ? humanize(fee.status) : "—"} icon={Wallet} tone={balance ? "amber" : "green"} href="/student/fees" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Upcoming classes" action={<Link href="/student/timetable" className="text-sm font-medium text-brand-600 hover:underline">Timetable & check-in</Link>} />
          <CardBody className="space-y-2">
            {!next?.length && <p className="text-sm text-muted">No upcoming classes scheduled.</p>}
            {next?.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                <div><p className="font-medium">{s.title}</p><p className="text-xs text-muted">{formatDateTime(s.starts_at)} – {formatTime(s.ends_at)}{s.location && ` · ${s.location}`}</p></div>
                {new Date(s.starts_at).getTime() - Date.now() < 15 * 60000 && <Button asChild size="sm" variant="accent"><Link href="/student/timetable">Check in</Link></Button>}
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Certificate" action={elig && <GradeBadge grade={elig.grade} />} />
          <CardBody>
            {elig && <>
              <p className="text-sm text-muted">{elig.checks.filter((c) => c.met).length} of {elig.checks.length} requirements met</p>
              <Progress value={(elig.checks.filter((c) => c.met).length * 100) / elig.checks.length} className="mt-2" tone={elig.eligible ? "green" : "brand"} />
              <ul className="mt-4 space-y-1.5 text-sm">
                {elig.checks.filter((c) => !c.met).slice(0, 4).map((c) => <li key={c.key} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />{c.label}</li>)}
              </ul>
            </>}
            <Button asChild variant="outline" size="sm" className="mt-4"><Link href="/student/certificate"><GraduationCap /> View checklist</Link></Button>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Upcoming deadlines" />
          <CardBody className="space-y-2">
            {!pending.length && <p className="text-sm text-muted">You are all caught up.</p>}
            {pending.slice(0, 4).map((a) => (
              <Link key={a.id} href={`/student/assignments/${a.id}`} className="block rounded-xl border border-line p-3 hover:bg-brand-50/50">
                <p className="font-medium">{a.title}</p><p className="text-xs text-muted">Due {formatDateTime(a.deadline)}</p>
              </Link>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Latest feedback" />
          <CardBody className="space-y-2">
            {!feedback?.length && <p className="text-sm text-muted">No feedback yet.</p>}
            {feedback?.map((f) => (
              <Link key={f.id} href={`/student/assignments/${f.assignments?.id}`} className="block rounded-xl border border-line p-3 hover:bg-brand-50/50">
                <div className="flex items-center justify-between gap-2"><p className="truncate font-medium">{f.assignments?.title}</p><Badge tone="blue">{f.marks ?? "—"}/{f.assignments?.max_marks}</Badge></div>
                <p className="line-clamp-2 text-xs text-muted">{f.feedback}</p>
              </Link>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Career" />
          <CardBody className="space-y-3 text-sm">
            {internship ? (
              <Link href="/student/internship" className="block rounded-xl border border-line p-3 hover:bg-brand-50/50">
                <div className="flex justify-between gap-2"><span className="font-medium">{internship.title}</span><StatusBadge status={internship.status} /></div>
                <p className="text-xs text-muted">{internship.organization}</p><Progress value={internship.progress_pct} className="mt-2 h-1.5" />
              </Link>
            ) : <p className="text-muted">No internship yet.</p>}
            {placement ? (
              <Link href="/student/placement" className="flex justify-between gap-2 rounded-xl border border-line p-3 hover:bg-brand-50/50"><span><span className="font-medium">{placement.job_role}</span><span className="block text-xs text-muted">{placement.company}</span></span><StatusBadge status={placement.status} /></Link>
            ) : <p className="text-muted">No placement activity yet.</p>}
          </CardBody>
        </Card>
      </div>

      {!!ann?.length && (
        <Card className="mt-6">
          <CardHeader title="Announcements" action={<Link href="/announcements" className="text-sm font-medium text-brand-600 hover:underline">All</Link>} />
          <CardBody className="space-y-3">{ann.map((a) => <div key={a.id}><p className="font-medium">{a.title}</p><p className="line-clamp-2 text-sm text-muted">{a.body}</p></div>)}</CardBody>
        </Card>
      )}
    </>
  );
}
