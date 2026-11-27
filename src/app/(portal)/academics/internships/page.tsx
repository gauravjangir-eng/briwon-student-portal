import Link from "next/link";
import { Plane, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select } from "@/components/ui/input";
import { saveInternship } from "@/lib/actions/outcomes";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Internships" };

export default async function InternshipsPage() {
  const user = await requireRole("admin", "trainer");
  const supabase = await createClient();
  const isAdmin = user.role === "admin";
  const [{ data }, students, trainers] = await Promise.all([
    supabase.from("internships").select("*, students(full_name, student_code), trainers(full_name), internship_reports(status)").order("start_date", { ascending: false }),
    isAdmin ? supabase.from("students").select("id, full_name, student_code").is("archived_at", null).order("full_name") : Promise.resolve({ data: [] }),
    isAdmin ? supabase.from("trainers").select("id, full_name").eq("status", "active").order("full_name") : Promise.resolve({ data: [] }),
  ]);
  return (
    <>
      <PageHeader title="Internships" description={isAdmin ? "Monitor every internship, mentor and weekly report." : "Internships you mentor. Review weekly reports and update progress."}
        actions={isAdmin && (
          <Dialog wide title="New internship" trigger={<Button><Plus /> New internship</Button>}>
            <ActionForm action={saveInternship} resetOnSuccess>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Student" name="student_id" required><Select id="student_id" name="student_id" defaultValue=""><option value="" disabled>Select</option>{students.data?.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.student_code})</option>)}</Select></FormField>
                <FormField label="Mentor" name="mentor_id"><Select id="mentor_id" name="mentor_id" defaultValue=""><option value="">Unassigned</option>{trainers.data?.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</Select></FormField>
                <FormField label="Internship title" name="title" required><Input id="title" name="title" /></FormField>
                <FormField label="Organization" name="organization"><Input id="organization" name="organization" /></FormField>
                <FormField label="Start date" name="start_date" required><Input id="start_date" name="start_date" type="date" /></FormField>
                <FormField label="End date" name="end_date"><Input id="end_date" name="end_date" type="date" /></FormField>
                <FormField label="Status" name="status"><Select id="status" name="status" defaultValue="planned">{["planned", "ongoing", "completed", "terminated"].map((s) => <option key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</option>)}</Select></FormField>
              </div>
              <div className="flex justify-end"><SubmitButton>Create internship</SubmitButton></div>
            </ActionForm>
          </Dialog>
        )} />
      <Card>
        {!data?.length ? <EmptyState icon={Plane} title="No internships yet" /> : (
          <Table>
            <THead><TR><TH>Student</TH><TH>Internship</TH><TH>Mentor</TH><TH>Dates</TH><TH>Progress</TH><TH>Reports to review</TH><TH>Status</TH></TR></THead>
            <TBody>
              {data.map((i) => {
                const pending = (i.internship_reports ?? []).filter((r) => r.status === "submitted").length;
                return (
                  <TR key={i.id}>
                    <TD><Link href={`/academics/internships/${i.id}`} className="font-semibold text-brand-700 hover:underline">{i.students?.full_name}</Link><p className="font-mono text-xs text-muted">{i.students?.student_code}</p></TD>
                    <TD className="text-sm">{i.title}<span className="block text-xs text-muted">{i.organization}</span></TD>
                    <TD className="text-sm">{i.trainers?.full_name ?? <span className="text-amber-700">Unassigned</span>}</TD>
                    <TD className="whitespace-nowrap text-xs">{formatDate(i.start_date)} – {formatDate(i.end_date)}</TD>
                    <TD className="min-w-28"><span className="text-xs">{i.progress_pct}%</span><Progress value={i.progress_pct} className="mt-1 h-1.5" /></TD>
                    <TD>{pending ? <Badge tone="amber">{pending}</Badge> : "—"}</TD>
                    <TD><StatusBadge status={i.status} /></TD>
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
