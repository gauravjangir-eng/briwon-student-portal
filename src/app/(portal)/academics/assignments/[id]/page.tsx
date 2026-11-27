import { notFound } from "next/navigation";
import { History, Paperclip, Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DescriptionList, EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select, Textarea } from "@/components/ui/input";
import { reviewSubmission } from "@/lib/actions/academics";
import { fileUrl } from "@/lib/storage";
import { formatDate, formatDateTime, humanize } from "@/lib/utils";
import { AssignmentForm } from "../assignment-form";

export const metadata = { title: "Assignment" };

export default async function AssignmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("admin", "trainer");
  const { id } = await params;
  const supabase = await createClient();
  const { data: a } = await supabase.from("assignments").select("*, batches(code, course_id), modules(title)").eq("id", id).maybeSingle();
  if (!a) notFound();
  const [{ data: roster }, { data: subs }, { data: history }, batches, { data: modules }] = await Promise.all([
    supabase.from("enrollments").select("students(id, full_name, student_code)").eq("batch_id", a.batch_id).eq("status", "active"),
    supabase.from("submissions").select("*").eq("assignment_id", id),
    supabase.from("submission_history").select("*, submissions!inner(assignment_id, student_id)").eq("submissions.assignment_id", id).order("recorded_at", { ascending: false }),
    batchOptions(supabase, user),
    supabase.from("modules").select("id, title, course_id, position").eq("course_id", a.course_id).order("position"),
  ]);
  const subBy = new Map((subs ?? []).map((s) => [s.student_id, s]));
  const students = (roster ?? []).map((r) => r.students!).filter(Boolean).sort((x, y) => x.full_name.localeCompare(y.full_name));

  return (
    <>
      <PageHeader back={{ href: "/academics/assignments", label: "Assignments" }} title={a.title}
        description={<span className="flex flex-wrap items-center gap-2">{a.batches?.code} · due {formatDateTime(a.deadline)} <StatusBadge status={a.status} />{a.is_required && <Badge tone="blue">Required</Badge>}</span>}
        actions={<Dialog wide title="Edit assignment" trigger={<Button variant="outline"><Pencil /> Edit</Button>}><AssignmentForm a={a} batches={batches} modules={modules ?? []} /></Dialog>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Details" />
          <CardBody>
            <DescriptionList cols={1} items={[
              ["Module", a.modules?.title], ["Assigned", formatDate(a.assigned_on)], ["Maximum marks", a.max_marks],
              ["Submission types", a.submission_types.map(humanize).join(", ")],
              ["Late policy", a.late_policy === "grace" ? "Accepted within grace period" : a.late_policy === "always" ? "Always accepted (late)" : "Not accepted"],
              ["Description", a.description], ["Instructions", a.instructions && <span className="whitespace-pre-wrap">{a.instructions}</span>],
              ["Attachments", a.attachment_paths.length ? a.attachment_paths.map((p) => <a key={p} href={fileUrl("course-files", p)!} className="flex items-center gap-1 text-brand-600 hover:underline"><Paperclip className="size-3.5" /> Download</a>) : null],
            ]} />
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Submissions" description={`${subs?.length ?? 0} of ${students.length} students submitted`} />
          {!students.length ? <EmptyState title="No students in this batch" /> : (
            <Table>
              <THead><TR><TH>Student</TH><TH>Submitted</TH><TH>Work</TH><TH>Marks</TH><TH>Status</TH><TH className="text-right">Review</TH></TR></THead>
              <TBody>
                {students.map((st) => {
                  const s = subBy.get(st.id);
                  return (
                    <TR key={st.id}>
                      <TD><p className="font-medium">{st.full_name}</p><p className="text-xs text-muted">{st.student_code}</p></TD>
                      <TD className="whitespace-nowrap text-xs">{s ? <>{formatDateTime(s.submitted_at)}{s.is_late && <Badge tone="amber" className="ml-1">Late</Badge>}{s.attempt > 1 && <span className="block text-muted">Attempt {s.attempt}</span>}</> : <span className="text-muted">Not submitted</span>}</TD>
                      <TD className="max-w-48 text-xs">
                        {s?.external_url && <a href={s.external_url} target="_blank" rel="noreferrer noopener" className="block truncate text-brand-600 hover:underline">{s.external_url}</a>}
                        {s?.file_path && <a href={fileUrl("student-files", s.file_path)!} className="block text-brand-600 hover:underline">Download file</a>}
                        {s?.content_text && <p className="line-clamp-2 text-muted">{s.content_text}</p>}
                      </TD>
                      <TD>{s?.marks ?? "—"}</TD>
                      <TD>{s ? <StatusBadge status={s.status} /> : <StatusBadge status="assigned" />}</TD>
                      <TD className="text-right">
                        {s && (
                          <Dialog wide title={`Review · ${st.full_name}`} description={`Original deadline ${formatDateTime(s.original_deadline)} · submitted ${formatDateTime(s.submitted_at)}`} trigger={<Button size="sm" variant={["submitted", "late", "under_review"].includes(s.status) ? "primary" : "outline"}>Review</Button>}>
                            {s.content_text && <div className="mb-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-canvas p-3 text-sm">{s.content_text}</div>}
                            <ActionForm action={reviewSubmission}>
                              <input type="hidden" name="id" value={s.id} />
                              <div className="grid gap-4 sm:grid-cols-2">
                                <FormField label={`Marks (out of ${a.max_marks})`} name="marks"><Input id="marks" name="marks" type="number" min={0} max={a.max_marks} step="0.5" defaultValue={s.marks ?? ""} /></FormField>
                                <FormField label="Decision" name="decision">
                                  <Select id="decision" name="decision" defaultValue="approved"><option value="approved">Approve</option><option value="revision_required">Request revision</option><option value="under_review">Mark under review</option></Select>
                                </FormField>
                              </div>
                              <FormField label="Feedback" name="feedback"><Textarea id="feedback" name="feedback" defaultValue={s.feedback ?? ""} /></FormField>
                              <div className="flex justify-end"><SubmitButton>Save review</SubmitButton></div>
                            </ActionForm>
                          </Dialog>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Submission history" description="Every submission, resubmission and review is preserved." />
        {!history?.length ? <EmptyState icon={History} title="No history yet" /> : (
          <Table>
            <THead><TR><TH>When</TH><TH>Student</TH><TH>Attempt</TH><TH>Status</TH><TH>Marks</TH><TH>Feedback</TH></TR></THead>
            <TBody>
              {history.slice(0, 50).map((h) => (
                <TR key={h.id}>
                  <TD className="whitespace-nowrap text-xs">{formatDateTime(h.recorded_at)}</TD>
                  <TD className="text-sm">{students.find((x) => x.id === h.submissions?.student_id)?.full_name ?? "—"}</TD>
                  <TD>{h.attempt}</TD><TD><StatusBadge status={h.status} /></TD><TD>{h.marks ?? "—"}</TD>
                  <TD className="max-w-xs truncate text-xs text-muted">{h.feedback}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
