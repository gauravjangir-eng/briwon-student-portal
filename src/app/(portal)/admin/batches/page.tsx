import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { courseOptions } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/client";
import { FilterBar } from "@/components/ui/filter-bar";
import { formatDate } from "@/lib/utils";
import { BatchForm, DAYS } from "./batch-form";

export const metadata = { title: "Batches" };

export default async function BatchesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; course?: string }> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const supabase = await createClient();
  const courses = await courseOptions(supabase, false);
  let q = supabase.from("batches").select("*, courses(name), batch_trainers(trainers(full_name)), enrollments(status)").order("start_date", { ascending: false });
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.course) q = q.eq("course_id", sp.course);
  if (sp.q) q = q.or(`code.ilike.%${sp.q.replace(/[%,()]/g, "")}%,name.ilike.%${sp.q.replace(/[%,()]/g, "")}%`);
  const { data: batches } = await q;
  return (
    <>
      <PageHeader title="Batches" description="Schedules, trainers, capacity and enrollment."
        actions={<Dialog wide title="New batch" trigger={<Button><Plus /> New batch</Button>}><BatchForm courses={courses} /></Dialog>} />
      <Card>
        <FilterBar q={sp.q} values={sp} placeholder="Batch code or name" filters={[
          { name: "status", label: "Status", options: ["planned", "active", "completed", "cancelled"].map((s) => ({ value: s, label: s[0]!.toUpperCase() + s.slice(1) })) },
          { name: "course", label: "Course", options: courses.map((c) => ({ value: c.id, label: c.name })) },
        ]} />
        {!batches?.length ? <EmptyState icon={Layers} title="No batches found" /> : (
          <Table>
            <THead><TR><TH>Batch</TH><TH>Course</TH><TH>Schedule</TH><TH>Dates</TH><TH>Trainer</TH><TH>Seats</TH><TH>Status</TH></TR></THead>
            <TBody>
              {batches.map((b) => {
                const enrolled = (b.enrollments ?? []).filter((e) => e.status === "active").length;
                return (
                  <TR key={b.id}>
                    <TD><Link href={`/admin/batches/${b.id}`} className="font-semibold hover:text-brand-600">{b.code}</Link><p className="text-xs text-muted">{b.name}</p></TD>
                    <TD>{b.courses?.name}</TD>
                    <TD className="text-xs">{b.schedule_days.map((d) => DAYS[d]).join(", ")}<br />{b.class_start_time.slice(0, 5)}–{b.class_end_time.slice(0, 5)}</TD>
                    <TD className="whitespace-nowrap text-xs">{formatDate(b.start_date)} –<br />{formatDate(b.end_date)}</TD>
                    <TD className="text-xs">{b.batch_trainers.map((t) => t.trainers?.full_name).join(", ") || <span className="text-amber-700">Unassigned</span>}</TD>
                    <TD className="min-w-28"><span className="text-xs">{enrolled}/{b.capacity}</span><Progress value={(enrolled * 100) / b.capacity} className="mt-1 h-1.5" tone={enrolled >= b.capacity ? "red" : "brand"} /></TD>
                    <TD><StatusBadge status={b.status} /></TD>
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
