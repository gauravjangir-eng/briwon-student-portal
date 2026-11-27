import { FolderKanban } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { currentEnrollment } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Textarea } from "@/components/ui/input";
import { submitProject } from "@/lib/actions/student";
import { fileUrl } from "@/lib/storage";
import { formatDateTime, humanize } from "@/lib/utils";

export const metadata = { title: "My projects" };

export default async function MyProjects() {
  const user = await requireStudent();
  const supabase = await createClient();
  const en = await currentEnrollment(supabase, user.studentId);
  if (!en) return <><PageHeader title="Projects" /><Card><EmptyState title="No active enrollment" /></Card></>;
  const [{ data: projects }, { data: subs }] = await Promise.all([
    supabase.from("projects").select("*").eq("batch_id", en.batch_id).order("kind", { ascending: false }).order("sequence"),
    supabase.from("project_submissions").select("*").eq("student_id", user.studentId),
  ]);
  const by = new Map((subs ?? []).map((s) => [s.project_id, s]));
  const minisDone = (projects ?? []).filter((p) => p.kind === "mini" && by.has(p.id)).length;
  return (
    <>
      <PageHeader title="My projects" description={`${minisDone} of 4 mini-projects submitted · capstone ${(projects ?? []).some((p) => p.kind === "capstone" && by.has(p.id)) ? "submitted" : "pending"}`} />
      {!projects?.length ? <Card><EmptyState icon={FolderKanban} title="No projects assigned yet" /></Card> : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => {
            const s = by.get(p.id);
            const canSubmit = !s || s.status === "revision_required" || s.status === "submitted";
            return (
              <Card key={p.id}>
                <CardHeader title={p.title} description={`Due ${formatDateTime(p.deadline)}`} action={<Badge tone={p.kind === "capstone" ? "violet" : "blue"}>{p.kind === "capstone" ? "Capstone" : `Mini ${p.sequence}`}</Badge>} />
                <CardBody className="space-y-3 text-sm">
                  {p.instructions && <p className="whitespace-pre-wrap text-muted">{p.instructions}</p>}
                  {s ? (
                    <div className="space-y-1 rounded-xl bg-canvas p-3">
                      <div className="flex flex-wrap items-center gap-2"><StatusBadge status={s.status} /><span className="text-xs">Presentation: {humanize(s.presentation_status)}</span>{s.marks != null && <Badge tone="blue">{s.marks}/{p.max_marks}</Badge>}</div>
                      {s.project_url && <a href={s.project_url} target="_blank" rel="noreferrer noopener" className="block truncate text-brand-600 hover:underline">{s.project_url}</a>}
                      {s.file_path && <a href={fileUrl("student-files", s.file_path)!} className="text-brand-600 hover:underline">Submitted file</a>}
                      {s.feedback && <p className="text-xs">Feedback: {s.feedback}</p>}
                      {s.presentation_at && <p className="text-xs text-muted">Presentation {formatDateTime(s.presentation_at)}</p>}
                    </div>
                  ) : <p className="text-muted">Not submitted yet.</p>}
                  {canSubmit && (
                    <Dialog title={`Submit · ${p.title}`} trigger={<Button size="sm" variant={s ? "outline" : "primary"}>{s ? "Resubmit" : "Submit project"}</Button>}>
                      <ActionForm action={submitProject}>
                        <input type="hidden" name="project_id" value={p.id} />
                        <FormField label="Project link (repository or live demo)" name="project_url"><Input id="project_url" name="project_url" type="url" placeholder="https://" defaultValue={s?.project_url ?? ""} /></FormField>
                        <FormField label="File (optional)" name="file" hint="ZIP, PDF or slides up to 10 MB"><Input id="file" name="file" type="file" className="py-1.5" /></FormField>
                        <FormField label="Notes for your trainer" name="notes"><Textarea id="notes" name="notes" defaultValue={s?.notes ?? ""} /></FormField>
                        <div className="flex justify-end"><SubmitButton>Submit</SubmitButton></div>
                      </ActionForm>
                    </Dialog>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
