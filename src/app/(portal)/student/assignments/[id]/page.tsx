import { notFound } from "next/navigation";
import { Paperclip } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { settings } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DescriptionList, InfoNote, PageHeader } from "@/components/ui/misc";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ActionForm, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Textarea } from "@/components/ui/input";
import { submitAssignment } from "@/lib/actions/student";
import { fileUrl } from "@/lib/storage";
import { formatDate, formatDateTime, humanize } from "@/lib/utils";

export const metadata = { title: "Assignment" };

export default async function MyAssignment({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStudent();
  const { id } = await params;
  const supabase = await createClient();
  const { data: a } = await supabase.from("assignments").select("*, modules(title)").eq("id", id).maybeSingle();
  if (!a) notFound();
  const [{ data: sub }, st] = await Promise.all([
    supabase.from("submissions").select("*").eq("assignment_id", id).eq("student_id", user.studentId).maybeSingle(),
    settings(supabase),
  ]);
  const { data: history } = sub ? await supabase.from("submission_history").select("*").eq("submission_id", sub.id).order("recorded_at", { ascending: false }) : { data: [] };

  const now = Date.now();
  const deadline = new Date(a.deadline).getTime();
  const graceEnd = deadline + st.late_submission_grace_days * 86400000;
  const lateWindow = a.late_policy === "always" || (a.late_policy === "grace" && now <= graceEnd);
  const canSubmit = !sub ? now <= deadline || lateWindow
    : sub.status === "revision_required" || (["submitted", "late"].includes(sub.status) && (now <= deadline || lateWindow));
  const types = new Set(a.submission_types);

  return (
    <>
      <PageHeader back={{ href: "/student/assignments", label: "My assignments" }} title={a.title}
        description={<span className="flex flex-wrap items-center gap-2">Due {formatDateTime(a.deadline)} · {a.max_marks} marks {a.is_required && <Badge tone="blue">Required</Badge>} {sub && <StatusBadge status={sub.status} />}</span>} />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Brief" />
          <CardBody>
            <DescriptionList cols={1} items={[
              ["Module", a.modules?.title], ["Assigned", formatDate(a.assigned_on)], ["Description", a.description],
              ["Instructions", a.instructions && <span className="whitespace-pre-wrap">{a.instructions}</span>],
              ["Accepted formats", a.submission_types.map(humanize).join(", ")],
              ["Late submissions", a.late_policy === "none" ? "Not accepted" : a.late_policy === "grace" ? `Accepted up to ${st.late_submission_grace_days} days late (marked late)` : "Accepted (marked late)"],
              ["Attachments", a.attachment_paths.length ? a.attachment_paths.map((p) => <a key={p} href={fileUrl("course-files", p)!} className="flex items-center gap-1 text-brand-600 hover:underline"><Paperclip className="size-3.5" /> Download brief</a>) : null],
            ]} />
          </CardBody>
        </Card>
        <div className="space-y-6 lg:col-span-2">
          {sub && (sub.feedback || sub.marks != null) && (
            <Card>
              <CardHeader title="Feedback" description={sub.reviewed_at ? `Reviewed ${formatDateTime(sub.reviewed_at)}` : undefined} action={sub.marks != null && <Badge tone="blue">{sub.marks}/{a.max_marks}</Badge>} />
              <CardBody className="whitespace-pre-wrap text-sm">{sub.feedback ?? "No written feedback."}</CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title={sub ? "Your submission" : "Submit your work"} description={sub ? `Attempt ${sub.attempt} · ${formatDateTime(sub.submitted_at)}${sub.is_late ? " · late" : ""}` : undefined} />
            <CardBody className="space-y-4">
              {sub && (
                <div className="space-y-1 text-sm">
                  {sub.external_url && <a className="block truncate text-brand-600 hover:underline" href={sub.external_url} target="_blank" rel="noreferrer noopener">{sub.external_url}</a>}
                  {sub.file_path && <a className="block text-brand-600 hover:underline" href={fileUrl("student-files", sub.file_path)!}>Download submitted file</a>}
                  {sub.content_text && <p className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-canvas p-2">{sub.content_text}</p>}
                </div>
              )}
              {sub?.status === "revision_required" && <InfoNote tone="amber">Your trainer asked for a revision. Update your work and resubmit.</InfoNote>}
              {canSubmit ? (
                <ActionForm action={submitAssignment}>
                  <input type="hidden" name="assignment_id" value={a.id} />
                  {now > deadline && sub?.status !== "revision_required" && <InfoNote tone="amber">The deadline has passed. This submission will be marked late.</InfoNote>}
                  {types.has("text") && <FormField label="Answer / notes" name="content_text"><Textarea id="content_text" name="content_text" defaultValue={sub?.content_text ?? ""} /></FormField>}
                  {(types.has("url") || types.has("project_link")) && <FormField label={types.has("project_link") ? "Project / repository link" : "Link"} name="external_url"><Input id="external_url" name="external_url" type="url" placeholder="https://" defaultValue={sub?.external_url ?? ""} /></FormField>}
                  {types.has("file") && <FormField label="File" name="file" hint="PDF, image, ZIP, Word or PowerPoint up to 10 MB"><Input id="file" name="file" type="file" className="py-1.5" /></FormField>}
                  <SubmitButton className="w-full" pendingText="Submitting…">{sub ? "Resubmit" : "Submit"}</SubmitButton>
                </ActionForm>
              ) : !sub ? <InfoNote tone="amber">Submissions are closed for this assignment.</InfoNote> : null}
            </CardBody>
          </Card>
          {!!history?.length && (
            <Card>
              <CardHeader title="History" />
              <CardBody className="space-y-2 text-xs">
                {history.map((h) => <div key={h.id} className="flex items-center justify-between gap-2"><span>{formatDateTime(h.recorded_at)} · attempt {h.attempt}</span><span className="flex items-center gap-1">{h.marks != null && <span>{h.marks}</span>}<StatusBadge status={h.status} /></span></div>)}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
