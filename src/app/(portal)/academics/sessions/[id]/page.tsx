import { notFound } from "next/navigation";
import { MapPin, Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, InfoNote, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, ConfirmAction, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Select, Textarea } from "@/components/ui/input";
import { markAttendance, setSessionStatus, staffRequestCorrection } from "@/lib/actions/academics";
import { formatDate, formatTime, humanize } from "@/lib/utils";
import { SessionForm } from "../session-form";

export const metadata = { title: "Session attendance" };
const STATUSES = ["present", "late", "absent", "excused"] as const;

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("admin", "trainer");
  const { id } = await params;
  const supabase = await createClient();
  const { data: s } = await supabase.from("class_sessions").select("*, batches(code, name)").eq("id", id).maybeSingle();
  if (!s) notFound();
  const [{ data: roster }, { data: att }, { data: pending }, batches] = await Promise.all([
    supabase.from("enrollments").select("students(id, full_name, student_code)").eq("batch_id", s.batch_id).eq("status", "active"),
    supabase.from("attendance").select("student_id, status, source, check_in_at, distance_m, accuracy_m").eq("session_id", id),
    supabase.from("attendance_correction_requests").select("student_id, requested_status").eq("session_id", id).eq("status", "pending"),
    batchOptions(supabase, user),
  ]);
  const byStudent = new Map((att ?? []).map((a) => [a.student_id, a]));
  const pendingBy = new Map((pending ?? []).map((p) => [p.student_id, p.requested_status]));
  const students = (roster ?? []).map((r) => r.students!).filter(Boolean).sort((a, b) => a.full_name.localeCompare(b.full_name));
  const counts = STATUSES.map((k) => [k, (att ?? []).filter((a) => a.status === k).length] as const);
  const isAdmin = user.role === "admin";

  return (
    <>
      <PageHeader back={{ href: "/academics/sessions", label: "Sessions" }} title={`${s.title} · ${s.batches?.code}`}
        description={<span className="flex flex-wrap items-center gap-2">{formatDate(s.starts_at)}, {formatTime(s.starts_at)}–{formatTime(s.ends_at)} {s.location && <>· <MapPin className="size-3.5" />{s.location}</>} <StatusBadge status={s.status} /></span>}
        actions={<>
          <Dialog title="Edit session" trigger={<Button variant="outline"><Pencil /> Reschedule</Button>}><SessionForm batches={batches} s={s} /></Dialog>
          {s.status === "scheduled" && <ConfirmAction action={setSessionStatus} fields={{ id: s.id, status: "completed" }} size="md" label="Mark completed" title="Mark this session as completed?" description="Student check-in closes." />}
          {s.status !== "cancelled" && <ConfirmAction action={setSessionStatus} fields={{ id: s.id, status: "cancelled" }} size="md" variant="ghost" label="Cancel session" title="Cancel this session?" description="Students in the batch will be notified. Cancelled sessions do not count towards attendance." confirmVariant="danger" />}
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {counts.map(([k, n]) => <div key={k} className="rounded-xl border border-line bg-white p-4"><p className="text-xs text-muted">{humanize(k)}</p><p className="text-2xl font-bold">{n}</p></div>)}
        <div className="rounded-xl border border-line bg-white p-4"><p className="text-xs text-muted">Not marked</p><p className="text-2xl font-bold">{students.length - (att?.length ?? 0)}</p></div>
      </div>

      <Card>
        <CardHeader title="Attendance register" description="Students who checked in with GPS appear automatically. Unmarked students can be marked here." />
        {!students.length ? <EmptyState title="No active students in this batch" /> : (
          <ActionForm action={markAttendance} onSuccessClose={false}>
            <input type="hidden" name="session_id" value={s.id} />
            <ul className="divide-y divide-line">
              {students.map((st) => {
                const a = byStudent.get(st.id);
                const locked = !!a && !isAdmin; // trainers change existing marks through a correction request
                return (
                  <li key={st.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{st.full_name}</p>
                      <p className="text-xs text-muted">{st.student_code}{a?.source === "check_in" && <> · GPS check-in {formatTime(a.check_in_at)} · {Math.round(a.distance_m ?? 0)} m away (±{Math.round(a.accuracy_m ?? 0)} m)</>}{a && a.source !== "check_in" && <> · marked by {a.source === "correction" ? "correction" : "staff"}</>}</p>
                      {pendingBy.has(st.id) && <p className="text-xs text-amber-700">Correction to “{humanize(pendingBy.get(st.id))}” awaiting admin approval</p>}
                    </div>
                    {locked ? (
                      <div className="flex items-center gap-2">
                        <StatusBadge status={a!.status} />
                        <Dialog title={`Request correction · ${st.full_name}`} description="An admin must approve changes to recorded attendance." trigger={<Button type="button" size="sm" variant="ghost">Correct</Button>}>
                          <CorrectionForm sessionId={s.id} studentId={st.id} />
                        </Dialog>
                      </div>
                    ) : (
                      <fieldset className="flex flex-wrap gap-1" aria-label={`Attendance for ${st.full_name}`}>
                        {STATUSES.map((k) => (
                          <label key={k} className="cursor-pointer rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-muted has-[:checked]:border-brand-500 has-[:checked]:bg-brand-700 has-[:checked]:text-white">
                            <input type="radio" className="sr-only" name={`status:${st.id}`} value={k} defaultChecked={a?.status === k} /> {humanize(k)}
                          </label>
                        ))}
                      </fieldset>
                    )}
                  </li>
                );
              })}
            </ul>
            <CardBody className="flex flex-wrap items-end justify-between gap-4 border-t border-line">
              {isAdmin ? <InfoNote>As an admin, your changes to existing marks are recorded in the attendance history.</InfoNote> : <span className="text-sm text-muted">Existing marks are locked; use “Correct” to request a change.</span>}
              <SubmitButton>Save attendance</SubmitButton>
            </CardBody>
          </ActionForm>
        )}
      </Card>
    </>
  );
}

function CorrectionForm({ sessionId, studentId }: { sessionId: string; studentId: string }) {
  return (
    <ActionForm action={staffRequestCorrection}>
      <input type="hidden" name="session_id" value={sessionId} /><input type="hidden" name="student_id" value={studentId} />
      <FormField label="Correct status" name="requested_status"><Select id="requested_status" name="requested_status">{STATUSES.map((k) => <option key={k} value={k}>{humanize(k)}</option>)}</Select></FormField>
      <FormField label="Reason" name="reason" required><Textarea id="reason" name="reason" /></FormField>
      <div className="flex justify-end"><SubmitButton>Send for approval</SubmitButton></div>
    </ActionForm>
  );
}
