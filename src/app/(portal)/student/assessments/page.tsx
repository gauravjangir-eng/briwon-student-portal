import { FileText } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { currentEnrollment } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My assessments" };

export default async function MyAssessments() {
  const user = await requireStudent();
  const supabase = await createClient();
  const en = await currentEnrollment(supabase, user.studentId);
  if (!en) return <><PageHeader title="Assessments" /><Card><EmptyState title="No active enrollment" /></Card></>;
  const [{ data: list }, { data: results }] = await Promise.all([
    supabase.from("assessments").select("*, trainers(full_name)").eq("batch_id", en.batch_id).order("assessment_date"),
    supabase.from("assessment_results").select("*").eq("student_id", user.studentId),
  ]);
  const by = new Map((results ?? []).map((r) => [r.assessment_id, r]));
  return (
    <>
      <PageHeader title="My assessments" description="Schedule and results. The final assessment needs at least 60% for your certificate." />
      <Card>
        {!list?.length ? <EmptyState icon={FileText} title="No assessments scheduled" /> : (
          <Table>
            <THead><TR><TH>Assessment</TH><TH>Date</TH><TH>Trainer</TH><TH>Score</TH><TH>Result</TH><TH>Feedback</TH></TR></THead>
            <TBody>
              {list.map((a) => {
                const r = by.get(a.id);
                const p = r ? (Number(r.score) * 100) / Number(a.max_marks) : null;
                return (
                  <TR key={a.id}>
                    <TD className="font-medium">{a.title}{a.is_final && <Badge tone="violet" className="ml-2">Final</Badge>}</TD>
                    <TD className="whitespace-nowrap">{formatDate(a.assessment_date)}</TD>
                    <TD className="text-sm">{a.trainers?.full_name ?? "—"}</TD>
                    <TD>{r ? `${r.score}/${a.max_marks}` : "—"}</TD>
                    <TD>{p === null ? <span className="text-xs text-muted">Pending</span> : <Badge tone={p >= Number(a.pass_pct) ? "green" : "red"}>{p >= Number(a.pass_pct) ? "Pass" : "Fail"} · {p.toFixed(0)}%</Badge>}</TD>
                    <TD className="max-w-xs text-sm text-muted">{r?.feedback ?? ""}</TD>
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
