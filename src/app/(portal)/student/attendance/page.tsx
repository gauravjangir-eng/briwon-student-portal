import { CalendarCheck, Plus } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { attendanceSummary, currentEnrollment, settings } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select, Textarea } from "@/components/ui/input";
import { requestCorrection, requestLeave } from "@/lib/actions/student";
import { formatDate, formatTime, pct } from "@/lib/utils";

export const metadata = { title: "My attendance" };

export default async function MyAttendance() {
  const user = await requireStudent();
  const supabase = await createClient();
  const en = await currentEnrollment(supabase, user.studentId);
  if (!en) return <><PageHeader title="Attendance" /><Card><EmptyState title="No active enrollment" /></Card></>;
  const [sum, st, { data: sessions }, { data: mine }, { data: corrections }, { data: leaves }] = await Promise.all([
    attendanceSummary(supabase, user.studentId, en.batch_id), settings(supabase),
    supabase.from("class_sessions").select("id, title, starts_at, status").eq("batch_id", en.batch_id).lte("starts_at", new Date().toISOString()).neq("status", "cancelled").order("starts_at", { ascending: false }).limit(60),
    supabase.from("attendance").select("session_id, status, check_in_at, source").eq("student_id", user.studentId),
    supabase.from("attendance_correction_requests").select("session_id, status, requested_status, review_note").eq("student_id", user.studentId),
    supabase.from("leave_requests").select("*").eq("student_id", user.studentId).order("created_at", { ascending: false }),
  ]);
  const by = new Map((mine ?? []).map((a) => [a.session_id, a]));
  const corr = new Map((corrections ?? []).map((c) => [c.session_id, c]));
  const p = sum?.pct ?? 0;

  return (
    <>
      <PageHeader title="My attendance" description={`${en.courses?.name} · ${en.batches?.code}`}
        actions={
          <Dialog title="Request leave" trigger={<Button variant="outline"><Plus /> Request leave</Button>}>
            <ActionForm action={requestLeave} resetOnSuccess>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="From" name="start_date" required><Input id="start_date" name="start_date" type="date" /></FormField>
                <FormField label="To" name="end_date" required><Input id="end_date" name="end_date" type="date" /></FormField>
              </div>
              <FormField label="Reason" name="reason" required><Textarea id="reason" name="reason" /></FormField>
              <div className="flex justify-end"><SubmitButton>Submit request</SubmitButton></div>
            </ActionForm>
          </Dialog>
        } />
      <Card className="mb-6">
        <CardBody className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
          <div><p className="text-xs uppercase tracking-wide text-muted">Attendance</p><p className={`font-display text-4xl font-bold ${p >= Number(st.min_attendance_pct) ? "text-emerald-600" : "text-amber-600"}`}>{pct(p, 1)}</p></div>
          <div>
            <Progress value={p} tone={p >= Number(st.min_attendance_pct) ? "green" : "amber"} />
            <p className="mt-2 text-sm text-muted">{sum?.present} present · {sum?.late} late · {sum?.absent} absent · {sum?.excused} excused of {sum?.total} classes so far. Minimum required: {Number(st.min_attendance_pct)}%.{Number(st.late_attendance_weight) < 1 && ` Late counts as ${Number(st.late_attendance_weight) * 100}% of a class.`}</p>
          </div>
        </CardBody>
      </Card>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="History" />
          {!sessions?.length ? <EmptyState icon={CalendarCheck} title="No classes yet" /> : (
            <Table>
              <THead><TR><TH>Date</TH><TH>Class</TH><TH>Status</TH><TH className="text-right">Correction</TH></TR></THead>
              <TBody>
                {sessions.map((s) => {
                  const a = by.get(s.id); const c = corr.get(s.id);
                  return (
                    <TR key={s.id}>
                      <TD className="whitespace-nowrap">{formatDate(s.starts_at)} <span className="text-xs text-muted">{formatTime(s.starts_at)}</span></TD>
                      <TD>{s.title}{a?.check_in_at && <span className="block text-xs text-muted">Checked in {formatTime(a.check_in_at)}</span>}</TD>
                      <TD><StatusBadge status={a?.status ?? "absent"} />{!a && <span className="ml-1 text-xs text-muted">(not marked)</span>}</TD>
                      <TD className="text-right">
                        {c ? <span className="text-xs">Request <StatusBadge status={c.status} /></span> : a?.status !== "present" && (
                          <Dialog title="Request attendance correction" description={`${s.title} · ${formatDate(s.starts_at)}`} trigger={<Button size="sm" variant="ghost">Request</Button>}>
                            <ActionForm action={requestCorrection}>
                              <input type="hidden" name="session_id" value={s.id} />
                              <FormField label="Should be" name="requested_status"><Select id="requested_status" name="requested_status"><option value="present">Present</option><option value="late">Late</option><option value="excused">Excused</option></Select></FormField>
                              <FormField label="What happened?" name="reason" required><Textarea id="reason" name="reason" /></FormField>
                              <div className="flex justify-end"><SubmitButton>Send request</SubmitButton></div>
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
        <Card>
          <CardHeader title="My leave requests" />
          <CardBody className="space-y-2">
            {!leaves?.length && <p className="text-sm text-muted">No leave requests.</p>}
            {leaves?.map((l) => (
              <div key={l.id} className="rounded-xl border border-line p-3 text-sm">
                <div className="flex items-center justify-between"><span className="font-medium">{formatDate(l.start_date)} – {formatDate(l.end_date)}</span><StatusBadge status={l.status} /></div>
                <p className="text-xs text-muted">{l.reason}</p>{l.review_note && <p className="mt-1 text-xs">Note: {l.review_note}</p>}
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
