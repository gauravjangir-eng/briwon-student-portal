import { Plane } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DescriptionList, EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { ActionForm, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Textarea } from "@/components/ui/input";
import { submitInternshipReport } from "@/lib/actions/student";
import { formatDate, formatDateTime, humanize } from "@/lib/utils";

export const metadata = { title: "My internship" };

export default async function MyInternship() {
  const user = await requireStudent();
  const supabase = await createClient();
  const { data: list } = await supabase.from("internships").select("*, trainers(full_name), internship_tasks(*), internship_reports(*)").eq("student_id", user.studentId).order("start_date", { ascending: false });
  if (!list?.length) return <><PageHeader title="Internship" /><Card><EmptyState icon={Plane} title="No internship assigned yet" description="The academy will add your internship here once it is arranged." /></Card></>;
  return (
    <>
      <PageHeader title="My internship" description="Submit a short report every week. Your mentor reviews each one." />
      <div className="space-y-8">
        {list.map((i) => {
          const reports = [...(i.internship_reports ?? [])].sort((a, b) => b.week_number - a.week_number);
          const nextWeek = (reports[0]?.week_number ?? 0) + 1;
          return (
            <div key={i.id} className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6">
                <Card>
                  <CardHeader title={i.title} description={i.organization ?? undefined} action={<StatusBadge status={i.status} />} />
                  <CardBody className="space-y-4">
                    <Progress value={i.progress_pct} />
                    <DescriptionList cols={1} items={[["Mentor", i.trainers?.full_name], ["Dates", `${formatDate(i.start_date)} – ${formatDate(i.end_date)}`], ["Progress", `${i.progress_pct}%`], ["Completion", humanize(i.completion_status)], ["Mentor feedback", i.feedback]]} />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader title="Tasks" />
                  <CardBody className="space-y-2 text-sm">
                    {!i.internship_tasks?.length && <p className="text-muted">No tasks yet.</p>}
                    {i.internship_tasks?.map((t) => <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-line p-2"><span>{t.title}<span className="block text-xs text-muted">Due {formatDate(t.due_date)}</span></span><StatusBadge status={t.status} /></div>)}
                  </CardBody>
                </Card>
              </div>
              <div className="space-y-6 lg:col-span-2">
                {(i.status === "ongoing" || i.status === "planned") && (
                  <Card>
                    <CardHeader title="Submit weekly report" />
                    <CardBody>
                      <ActionForm action={submitInternshipReport} resetOnSuccess>
                        <input type="hidden" name="internship_id" value={i.id} />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField label="Week number" name="week_number"><Input id="week_number" name="week_number" type="number" min={1} defaultValue={nextWeek} /></FormField>
                          <FormField label="Hours worked" name="hours_worked"><Input id="hours_worked" name="hours_worked" type="number" min={0} max={168} step="0.5" /></FormField>
                        </div>
                        <FormField label="What did you work on and learn?" name="summary" required><Textarea id="summary" name="summary" /></FormField>
                        <FormField label="Attachment (optional)" name="file"><Input id="file" name="file" type="file" className="py-1.5" /></FormField>
                        <div className="flex justify-end"><SubmitButton>Submit report</SubmitButton></div>
                      </ActionForm>
                    </CardBody>
                  </Card>
                )}
                <Card>
                  <CardHeader title="My reports" />
                  <CardBody className="space-y-3">
                    {!reports.length && <p className="text-sm text-muted">No reports yet.</p>}
                    {reports.map((r) => (
                      <div key={r.id} className="rounded-xl border border-line p-3">
                        <div className="flex items-center justify-between"><p className="font-medium">Week {r.week_number} <span className="text-xs font-normal text-muted">· {formatDateTime(r.submitted_at)}</span></p><StatusBadge status={r.status} /></div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{r.summary}</p>
                        {r.mentor_comment && <p className="mt-2 rounded-lg bg-brand-50 p-2 text-sm text-brand-800">Mentor: {r.mentor_comment}</p>}
                      </div>
                    ))}
                  </CardBody>
                </Card>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
