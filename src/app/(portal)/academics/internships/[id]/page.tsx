import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DescriptionList, EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select, Textarea } from "@/components/ui/input";
import { reviewInternshipReport, saveInternshipTask, updateInternshipProgress } from "@/lib/actions/academics";
import { fileUrl } from "@/lib/storage";
import { formatDate, formatDateTime, humanize } from "@/lib/utils";

export const metadata = { title: "Internship" };

export default async function InternshipDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin", "trainer");
  const { id } = await params;
  const supabase = await createClient();
  const { data: i } = await supabase.from("internships").select("*, students(full_name, student_code), trainers(full_name)").eq("id", id).maybeSingle();
  if (!i) notFound();
  const [{ data: tasks }, { data: reports }] = await Promise.all([
    supabase.from("internship_tasks").select("*").eq("internship_id", id).order("due_date"),
    supabase.from("internship_reports").select("*").eq("internship_id", id).order("week_number", { ascending: false }),
  ]);
  return (
    <>
      <PageHeader back={{ href: "/academics/internships", label: "Internships" }} title={`${i.students?.full_name} · ${i.title}`}
        description={<span className="flex items-center gap-2">{i.organization} · mentor {i.trainers?.full_name ?? "unassigned"} <StatusBadge status={i.status} /></span>}
        actions={
          <Dialog title="Update progress & approval" trigger={<Button>Update progress</Button>}>
            <ActionForm action={updateInternshipProgress}>
              <input type="hidden" name="id" value={i.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Progress (%)" name="progress_pct"><Input id="progress_pct" name="progress_pct" type="number" min={0} max={100} defaultValue={i.progress_pct} /></FormField>
                <FormField label="Status" name="status"><Select id="status" name="status" defaultValue={i.status}>{["planned", "ongoing", "completed", "terminated"].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select></FormField>
                <FormField label="Completion approval" name="completion_status" className="sm:col-span-2"><Select id="completion_status" name="completion_status" defaultValue={i.completion_status}><option value="in_progress">In progress</option><option value="approved">Approved as complete</option><option value="not_approved">Not approved</option></Select></FormField>
              </div>
              <FormField label="Mentor feedback" name="feedback"><Textarea id="feedback" name="feedback" defaultValue={i.feedback ?? ""} /></FormField>
              <div className="flex justify-end"><SubmitButton>Save</SubmitButton></div>
            </ActionForm>
          </Dialog>
        } />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Overview" />
            <CardBody className="space-y-4">
              <Progress value={i.progress_pct} />
              <DescriptionList cols={1} items={[["Dates", `${formatDate(i.start_date)} – ${formatDate(i.end_date)}`], ["Progress", `${i.progress_pct}%`], ["Completion", humanize(i.completion_status)], ["Feedback", i.feedback]]} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Tasks" action={
              <Dialog title="Add task" trigger={<Button size="sm" variant="outline"><Plus /> Task</Button>}>
                <ActionForm action={saveInternshipTask} resetOnSuccess>
                  <input type="hidden" name="internship_id" value={i.id} />
                  <FormField label="Title" name="title" required><Input id="title" name="title" /></FormField>
                  <FormField label="Description" name="description"><Textarea id="description" name="description" /></FormField>
                  <FormField label="Due date" name="due_date"><Input id="due_date" name="due_date" type="date" /></FormField>
                  <div className="flex justify-end"><SubmitButton>Add task</SubmitButton></div>
                </ActionForm>
              </Dialog>
            } />
            <CardBody className="space-y-2">
              {!tasks?.length && <p className="text-sm text-muted">No tasks yet.</p>}
              {tasks?.map((t) => (
                <div key={t.id} className="rounded-xl border border-line p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><span className="font-medium">{t.title}</span><StatusBadge status={t.status} /></div>
                  <p className="text-xs text-muted">Due {formatDate(t.due_date)}</p>
                  <ActionForm action={saveInternshipTask} className="mt-2 flex items-center gap-2 space-y-0" successToast={false}>
                    <input type="hidden" name="id" value={t.id} /><input type="hidden" name="internship_id" value={i.id} /><input type="hidden" name="title" value={t.title} />
                    <Select name="status" defaultValue={t.status} className="h-8 text-xs" aria-label="Task status"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></Select>
                    <SubmitButton size="sm" variant="outline" pendingText="…">Update</SubmitButton>
                  </ActionForm>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
        <Card className="lg:col-span-2">
          <CardHeader title="Weekly reports" />
          {!reports?.length ? <EmptyState title="No reports submitted yet" /> : (
            <ul className="divide-y divide-line">
              {reports.map((r) => (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">Week {r.week_number} <span className="text-xs font-normal text-muted">· {formatDateTime(r.submitted_at)}{r.hours_worked != null && ` · ${r.hours_worked} h`}</span></p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{r.summary}</p>
                  {r.file_path && <a className="mt-1 inline-block text-sm text-brand-600 hover:underline" href={fileUrl("student-files", r.file_path)!}>Attachment</a>}
                  {r.mentor_comment && <p className="mt-2 rounded-lg bg-brand-50 p-2 text-sm text-brand-800">Mentor: {r.mentor_comment}</p>}
                  {r.status === "submitted" && (
                    <ActionForm action={reviewInternshipReport} className="mt-3 space-y-2">
                      <input type="hidden" name="id" value={r.id} />
                      <Textarea name="mentor_comment" placeholder="Comment for the student" className="min-h-16" aria-label="Mentor comment" />
                      <div className="flex gap-2">
                        <Select name="status" className="w-auto" aria-label="Decision"><option value="approved">Approve</option><option value="revision_required">Request revision</option></Select>
                        <SubmitButton size="md">Submit review</SubmitButton>
                      </div>
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
