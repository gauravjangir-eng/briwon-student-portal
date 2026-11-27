import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select, Textarea } from "@/components/ui/input";
import { reviewProject } from "@/lib/actions/academics";
import { fileUrl } from "@/lib/storage";
import { formatDateTime, humanize, isoToAcademyInput } from "@/lib/utils";
import { ProjectForm } from "../project-form";

export const metadata = { title: "Project" };

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("admin", "trainer");
  const { id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase.from("projects").select("*, batches(code)").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: roster }, { data: subs }, batches] = await Promise.all([
    supabase.from("enrollments").select("students(id, full_name, student_code)").eq("batch_id", p.batch_id).eq("status", "active"),
    supabase.from("project_submissions").select("*").eq("project_id", id),
    batchOptions(supabase, user),
  ]);
  const by = new Map((subs ?? []).map((s) => [s.student_id, s]));
  const students = (roster ?? []).map((r) => r.students!).filter(Boolean).sort((a, b) => a.full_name.localeCompare(b.full_name));
  return (
    <>
      <PageHeader back={{ href: "/academics/projects", label: "Projects" }} title={p.title}
        description={<span className="flex flex-wrap items-center gap-2">{p.batches?.code} · due {formatDateTime(p.deadline)} <Badge tone={p.kind === "capstone" ? "violet" : "blue"}>{p.kind === "capstone" ? "Capstone" : `Mini-project ${p.sequence}`}</Badge></span>}
        actions={<Dialog wide title="Edit project" trigger={<Button variant="outline"><Pencil /> Edit</Button>}><ProjectForm p={p} batches={batches} /></Dialog>} />
      {p.instructions && <Card className="mb-6"><CardBody className="whitespace-pre-wrap text-sm">{p.instructions}</CardBody></Card>}
      <Card>
        <CardHeader title="Student submissions" description={`${subs?.length ?? 0} of ${students.length} submitted`} />
        {!students.length ? <EmptyState title="No students" /> : (
          <Table>
            <THead><TR><TH>Student</TH><TH>Submitted</TH><TH>Work</TH><TH>Presentation</TH><TH>Marks</TH><TH>Status</TH><TH className="text-right">Review</TH></TR></THead>
            <TBody>
              {students.map((st) => {
                const s = by.get(st.id);
                return (
                  <TR key={st.id}>
                    <TD><p className="font-medium">{st.full_name}</p><p className="text-xs text-muted">{st.student_code}</p></TD>
                    <TD className="text-xs">{s ? formatDateTime(s.submitted_at) : <span className="text-muted">Not submitted</span>}</TD>
                    <TD className="max-w-48 text-xs">
                      {s?.project_url && <a href={s.project_url} target="_blank" rel="noreferrer noopener" className="block truncate text-brand-600 hover:underline">{s.project_url}</a>}
                      {s?.file_path && <a href={fileUrl("student-files", s.file_path)!} className="text-brand-600 hover:underline">Download file</a>}
                    </TD>
                    <TD>{s ? <StatusBadge status={s.presentation_status} /> : "—"}</TD>
                    <TD>{s?.marks ?? "—"}/{p.max_marks}</TD>
                    <TD>{s ? <StatusBadge status={s.status} /> : "—"}</TD>
                    <TD className="text-right">
                      {s && (
                        <Dialog wide title={`Review · ${st.full_name}`} trigger={<Button size="sm" variant={s.status === "submitted" ? "primary" : "outline"}>Review</Button>}>
                          {s.notes && <p className="mb-4 rounded-xl bg-canvas p-3 text-sm">{s.notes}</p>}
                          <ActionForm action={reviewProject}>
                            <input type="hidden" name="id" value={s.id} />
                            <div className="grid gap-4 sm:grid-cols-2">
                              <FormField label={`Marks (out of ${p.max_marks})`} name="marks"><Input id="marks" name="marks" type="number" min={0} max={p.max_marks} step="0.5" defaultValue={s.marks ?? ""} /></FormField>
                              <FormField label="Decision" name="decision"><Select id="decision" name="decision" defaultValue="approved"><option value="approved">Approve</option><option value="revision_required">Request revision</option><option value="under_review">Under review</option></Select></FormField>
                              <FormField label="Presentation" name="presentation_status">
                                <Select id="presentation_status" name="presentation_status" defaultValue={s.presentation_status}>{["not_required", "pending", "scheduled", "completed"].map((k) => <option key={k} value={k}>{humanize(k)}</option>)}</Select>
                              </FormField>
                              <FormField label="Presentation date (IST)" name="presentation_at"><Input id="presentation_at" name="presentation_at" type="datetime-local" defaultValue={isoToAcademyInput(s.presentation_at)} /></FormField>
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
    </>
  );
}
