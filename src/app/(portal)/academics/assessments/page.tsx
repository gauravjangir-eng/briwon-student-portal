import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions, settings } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/client";
import { formatDate } from "@/lib/utils";
import { AssessmentForm } from "./assessment-form";

export const metadata = { title: "Assessments" };

export default async function AssessmentsPage() {
  const user = await requireRole("admin", "trainer");
  const supabase = await createClient();
  const [batches, st, { data }] = await Promise.all([
    batchOptions(supabase, user), settings(supabase),
    supabase.from("assessments").select("*, batches(code), trainers(full_name), assessment_results(score)").order("assessment_date", { ascending: false }),
  ]);
  return (
    <>
      <PageHeader title="Assessments" description="Schedule assessments and record results."
        actions={<Dialog title="New assessment" trigger={<Button><Plus /> New assessment</Button>}><AssessmentForm batches={batches} defaultPass={Number(st.min_final_assessment_pct)} /></Dialog>} />
      <Card>
        {!data?.length ? <EmptyState icon={FileText} title="No assessments scheduled" /> : (
          <Table>
            <THead><TR><TH>Assessment</TH><TH>Batch</TH><TH>Date</TH><TH>Trainer</TH><TH>Graded</TH><TH>Pass rate</TH></TR></THead>
            <TBody>
              {data.map((a) => {
                const r = a.assessment_results ?? [];
                const passed = r.filter((x) => (Number(x.score) * 100) / Number(a.max_marks) >= Number(a.pass_pct)).length;
                return (
                  <TR key={a.id}>
                    <TD><Link href={`/academics/assessments/${a.id}`} className="font-semibold text-brand-700 hover:underline">{a.title}</Link>{a.is_final && <Badge tone="violet" className="ml-2">Final</Badge>}</TD>
                    <TD>{a.batches?.code}</TD><TD className="whitespace-nowrap">{formatDate(a.assessment_date)}</TD><TD className="text-sm">{a.trainers?.full_name ?? "—"}</TD>
                    <TD>{r.length}</TD><TD>{r.length ? `${Math.round((passed * 100) / r.length)}%` : "—"}</TD>
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
