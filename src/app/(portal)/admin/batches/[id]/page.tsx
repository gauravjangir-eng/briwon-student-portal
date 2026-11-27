import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, Pencil, UserPlus, X } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { courseOptions } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DescriptionList, EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, ConfirmAction, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select } from "@/components/ui/input";
import { assignTrainer, generateSessions, removeTrainer } from "@/lib/actions/catalog";
import { formatDate, formatDateTime } from "@/lib/utils";
import { BatchForm, DAYS } from "../batch-form";

export const metadata = { title: "Batch" };

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: b }, { data: bt }, { data: trainers }, { data: roster }, { data: sessions }, courses] = await Promise.all([
    supabase.from("batches").select("*, courses(name)").eq("id", id).maybeSingle(),
    supabase.from("batch_trainers").select("trainer_id, is_primary, trainers(full_name, email)").eq("batch_id", id),
    supabase.from("trainers").select("id, full_name").eq("status", "active").order("full_name"),
    supabase.from("enrollments").select("id, status, enrolled_on, students(id, full_name, student_code, status)").eq("batch_id", id).order("created_at"),
    supabase.from("class_sessions").select("id, title, starts_at, status").eq("batch_id", id).gte("starts_at", new Date(Date.now() - 86400000).toISOString()).order("starts_at").limit(8),
    courseOptions(supabase, false),
  ]);
  if (!b) notFound();
  const assigned = new Set((bt ?? []).map((t) => t.trainer_id));
  const activeCount = (roster ?? []).filter((r) => r.status === "active").length;

  return (
    <>
      <PageHeader back={{ href: "/admin/batches", label: "Batches" }} title={`${b.code} · ${b.name}`} description={<span className="flex items-center gap-2">{b.courses?.name} <StatusBadge status={b.status} /></span>}
        actions={<>
          <Dialog title="Generate timetable" description="Creates class sessions on the batch's class days. Days that already have a session are skipped." trigger={<Button variant="outline"><CalendarPlus /> Generate sessions</Button>}>
            <ActionForm action={generateSessions}>
              <input type="hidden" name="batch_id" value={b.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="From" name="from"><Input id="from" name="from" type="date" defaultValue={b.start_date} /></FormField>
                <FormField label="To" name="to"><Input id="to" name="to" type="date" defaultValue={b.end_date} /></FormField>
              </div>
              <div className="flex justify-end"><SubmitButton>Generate</SubmitButton></div>
            </ActionForm>
          </Dialog>
          <Dialog wide title="Edit batch" trigger={<Button variant="outline"><Pencil /> Edit</Button>}><BatchForm b={b} courses={courses} /></Dialog>
        </>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <DescriptionList cols={1} items={[
                ["Dates", `${formatDate(b.start_date)} – ${formatDate(b.end_date)}`],
                ["Schedule", `${b.schedule_days.map((d) => DAYS[d]).join(", ")} · ${b.class_start_time.slice(0, 5)}–${b.class_end_time.slice(0, 5)}`],
                ["Location", b.location], ["Capacity", `${activeCount} enrolled of ${b.capacity}`],
              ]} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Trainers" action={
              <Dialog title="Assign trainer" trigger={<Button size="sm" variant="outline"><UserPlus /> Assign</Button>}>
                <ActionForm action={assignTrainer}>
                  <input type="hidden" name="batch_id" value={b.id} />
                  <FormField label="Trainer" name="trainer_id" required>
                    <Select id="trainer_id" name="trainer_id" defaultValue=""><option value="" disabled>Select</option>
                      {(trainers ?? []).filter((t) => !assigned.has(t.id)).map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </Select>
                  </FormField>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_primary" defaultChecked={!bt?.length} className="accent-brand-700" /> Primary trainer</label>
                  <div className="flex justify-end"><SubmitButton>Assign</SubmitButton></div>
                </ActionForm>
              </Dialog>
            } />
            <CardBody className="space-y-2">
              {!bt?.length && <p className="text-sm text-amber-700">No trainer assigned yet.</p>}
              {bt?.map((t) => (
                <div key={t.trainer_id} className="flex items-center justify-between rounded-xl border border-line p-3 text-sm">
                  <span><span className="font-medium">{t.trainers?.full_name}</span>{t.is_primary && <Badge tone="blue" className="ml-2">Primary</Badge>}</span>
                  <ConfirmAction action={removeTrainer} fields={{ batch_id: b.id, trainer_id: t.trainer_id }} label={<X className="size-4" />} size="icon" variant="ghost" title="Remove trainer from batch?" description="They will lose access to this batch's students." confirmVariant="danger" confirmLabel="Remove" />
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Upcoming sessions" action={<Link href={`/academics/sessions?batch=${b.id}`} className="text-sm font-medium text-brand-600 hover:underline">All</Link>} />
            <CardBody className="space-y-2">
              {!sessions?.length && <p className="text-sm text-muted">No upcoming sessions. Use “Generate sessions”.</p>}
              {sessions?.map((s) => (
                <Link key={s.id} href={`/academics/sessions/${s.id}`} className="flex items-center justify-between rounded-xl border border-line p-3 text-sm hover:bg-brand-50/50">
                  <span>{formatDateTime(s.starts_at)}</span><StatusBadge status={s.status} />
                </Link>
              ))}
            </CardBody>
          </Card>
        </div>
        <Card className="lg:col-span-2">
          <CardHeader title="Students" description={`${activeCount} active`} action={<Button asChild size="sm"><Link href="/admin/students/new"><UserPlus /> Admit</Link></Button>} />
          {!roster?.length ? <EmptyState title="No students enrolled yet" /> : (
            <Table>
              <THead><TR><TH>Student</TH><TH>ID</TH><TH>Enrolled</TH><TH>Enrollment</TH></TR></THead>
              <TBody>
                {roster.map((r) => (
                  <TR key={r.id}>
                    <TD><Link href={`/students/${r.students?.id}`} className="font-medium hover:text-brand-600">{r.students?.full_name}</Link></TD>
                    <TD className="font-mono text-xs">{r.students?.student_code}</TD>
                    <TD className="text-xs">{formatDate(r.enrolled_on)}</TD>
                    <TD><StatusBadge status={r.status} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
