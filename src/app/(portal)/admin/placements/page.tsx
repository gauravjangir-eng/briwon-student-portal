import { Briefcase, Pencil, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, InfoNote, PageHeader } from "@/components/ui/misc";
import { FilterBar } from "@/components/ui/filter-bar";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select, Textarea } from "@/components/ui/input";
import { saveInterview, savePlacement } from "@/lib/actions/outcomes";
import { PLACEMENT_STATUSES } from "@/lib/validation";
import { formatDate, formatDateTime, humanize } from "@/lib/utils";
import { fileUrl } from "@/lib/storage";

export const metadata = { title: "Placements" };

type P = { id: string; student_id: string; company: string; job_role: string; status: string; applied_on: string | null; offer_details: string | null; outcome: string | null; notes: string | null };

function PlacementForm({ p, students }: { p?: P; students: { id: string; full_name: string; student_code: string | null }[] }) {
  return (
    <ActionForm action={savePlacement} resetOnSuccess={!p}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Student" name="student_id" required>
          <Select id="student_id" name="student_id" defaultValue={p?.student_id ?? ""} disabled={!!p}><option value="" disabled>Select</option>{students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.student_code})</option>)}</Select>
          {p && <input type="hidden" name="student_id" value={p.student_id} />}
        </FormField>
        <FormField label="Status" name="status"><Select id="status" name="status" defaultValue={p?.status ?? "preparing"}>{PLACEMENT_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select></FormField>
        <FormField label="Company" name="company" required><Input id="company" name="company" defaultValue={p?.company} /></FormField>
        <FormField label="Job role" name="job_role" required><Input id="job_role" name="job_role" defaultValue={p?.job_role} /></FormField>
        <FormField label="Applied on" name="applied_on"><Input id="applied_on" name="applied_on" type="date" defaultValue={p?.applied_on ?? ""} /></FormField>
        <FormField label="Outcome" name="outcome"><Input id="outcome" name="outcome" defaultValue={p?.outcome ?? ""} /></FormField>
      </div>
      <FormField label="Offer details (confidential)" name="offer_details" hint="Visible to admins and the student only"><Textarea id="offer_details" name="offer_details" defaultValue={p?.offer_details ?? ""} className="min-h-16" /></FormField>
      <FormField label="Staff notes" name="notes" hint="Visible to admins and the student"><Textarea id="notes" name="notes" defaultValue={p?.notes ?? ""} className="min-h-16" /></FormField>
      <div className="flex justify-end"><SubmitButton>{p ? "Save" : "Create record"}</SubmitButton></div>
    </ActionForm>
  );
}

export default async function PlacementsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("placements").select("*, students(full_name, student_code, skills, portfolio_url, resume_path), placement_interviews(*)").order("updated_at", { ascending: false });
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.q) q = q.or(`company.ilike.%${sp.q.replace(/[%,()]/g, "")}%,job_role.ilike.%${sp.q.replace(/[%,()]/g, "")}%`);
  const [{ data }, { data: students }] = await Promise.all([q, supabase.from("students").select("id, full_name, student_code").is("archived_at", null).order("full_name")]);
  return (
    <>
      <PageHeader title="Placement tracking" description="Applications, interview rounds and outcomes."
        actions={<Dialog wide title="New placement record" trigger={<Button><Plus /> New record</Button>}><PlacementForm students={students ?? []} /></Dialog>} />
      <div className="mb-4"><InfoNote>Placement support is guidance, not a guarantee. Avoid recording or communicating any promise of placement.</InfoNote></div>
      <Card>
        <FilterBar q={sp.q} values={sp} placeholder="Company or role" filters={[{ name: "status", label: "Status", options: PLACEMENT_STATUSES.map((s) => ({ value: s, label: humanize(s) })) }]} />
        {!data?.length ? <EmptyState icon={Briefcase} title="No placement records" /> : (
          <ul className="divide-y divide-line">
            {data.map((p) => (
              <li key={p.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_1fr_auto]">
                <div className="min-w-0">
                  <p className="font-semibold">{p.students?.full_name} <span className="font-mono text-xs font-normal text-muted">{p.students?.student_code}</span></p>
                  <p className="text-sm">{p.job_role} · <span className="text-muted">{p.company}</span></p>
                  <p className="mt-1 text-xs text-muted">Applied {formatDate(p.applied_on)} · updated {formatDate(p.updated_at)}</p>
                  <p className="mt-1 text-xs text-muted">{p.students?.skills?.join(", ")}{p.students?.portfolio_url && <> · <a className="text-brand-600 hover:underline" href={p.students.portfolio_url} target="_blank" rel="noreferrer noopener">Portfolio</a></>}{p.students?.resume_path && <> · <a className="text-brand-600 hover:underline" href={fileUrl("student-files", p.students.resume_path)!}>Resume</a></>}</p>
                </div>
                <div className="text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Interview rounds</p>
                  {!p.placement_interviews.length && <p className="text-xs text-muted">None yet</p>}
                  {p.placement_interviews.sort((a, b) => a.round_number - b.round_number).map((r) => (
                    <p key={r.id} className="flex items-center gap-2 text-xs">{r.round_number}. {r.round_name} · {formatDateTime(r.scheduled_at)} <StatusBadge status={r.status} /></p>
                  ))}
                </div>
                <div className="flex items-start gap-2 lg:justify-end">
                  <StatusBadge status={p.status} />
                  <Dialog title="Add interview round" trigger={<Button size="sm" variant="outline"><Plus /> Round</Button>}>
                    <ActionForm action={saveInterview} resetOnSuccess>
                      <input type="hidden" name="placement_id" value={p.id} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField label="Round no." name="round_number"><Input id="round_number" name="round_number" type="number" min={1} defaultValue={p.placement_interviews.length + 1} /></FormField>
                        <FormField label="Round name" name="round_name" required><Input id="round_name" name="round_name" placeholder="Technical interview" /></FormField>
                        <FormField label="Scheduled (IST)" name="scheduled_at"><Input id="scheduled_at" name="scheduled_at" type="datetime-local" /></FormField>
                        <FormField label="Status" name="status"><Select id="status" name="status">{["scheduled", "completed", "passed", "failed", "cancelled"].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select></FormField>
                      </div>
                      <FormField label="Feedback" name="feedback"><Textarea id="feedback" name="feedback" /></FormField>
                      <div className="flex justify-end"><SubmitButton>Save round</SubmitButton></div>
                    </ActionForm>
                  </Dialog>
                  <Dialog wide title="Edit placement" trigger={<Button size="sm" variant="ghost" aria-label="Edit"><Pencil /></Button>}><PlacementForm p={p} students={students ?? []} /></Dialog>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <CardBody className="px-0 text-xs text-muted">Offer details and staff notes are hidden from trainers.</CardBody>
    </>
  );
}
