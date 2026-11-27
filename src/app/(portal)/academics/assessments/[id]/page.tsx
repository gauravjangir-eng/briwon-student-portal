import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, Dialog, SubmitButton } from "@/components/ui/client";
import { Input } from "@/components/ui/input";
import { saveResults } from "@/lib/actions/academics";
import { formatDate } from "@/lib/utils";
import { AssessmentForm } from "../assessment-form";

export const metadata = { title: "Assessment results" };

export default async function AssessmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("admin", "trainer");
  const { id } = await params;
  const supabase = await createClient();
  const { data: a } = await supabase.from("assessments").select("*, batches(code)").eq("id", id).maybeSingle();
  if (!a) notFound();
  const [{ data: roster }, { data: results }, batches] = await Promise.all([
    supabase.from("enrollments").select("students(id, full_name, student_code)").eq("batch_id", a.batch_id).in("status", ["active", "completed"]),
    supabase.from("assessment_results").select("*").eq("assessment_id", id),
    batchOptions(supabase, user),
  ]);
  const by = new Map((results ?? []).map((r) => [r.student_id, r]));
  const students = (roster ?? []).map((r) => r.students!).filter(Boolean).sort((x, y) => x.full_name.localeCompare(y.full_name));
  return (
    <>
      <PageHeader back={{ href: "/academics/assessments", label: "Assessments" }} title={a.title}
        description={<>{a.batches?.code} · {formatDate(a.assessment_date)} · max {a.max_marks} · pass {a.pass_pct}% {a.is_final && <Badge tone="violet">Final</Badge>}</>}
        actions={<Dialog title="Edit assessment" trigger={<Button variant="outline"><Pencil /> Edit</Button>}><AssessmentForm a={a} batches={batches} defaultPass={Number(a.pass_pct)} /></Dialog>} />
      <Card>
        <CardHeader title="Results" description="Enter scores and feedback, then save. Students are notified." />
        {!students.length ? <EmptyState title="No students" /> : (
          <ActionForm action={saveResults} onSuccessClose={false}>
            <input type="hidden" name="assessment_id" value={a.id} />
            <Table>
              <THead><TR><TH>Student</TH><TH className="w-32">Score</TH><TH>Result</TH><TH>Feedback</TH></TR></THead>
              <TBody>
                {students.map((st) => {
                  const r = by.get(st.id);
                  const pctV = r ? (Number(r.score) * 100) / Number(a.max_marks) : null;
                  return (
                    <TR key={st.id}>
                      <TD><p className="font-medium">{st.full_name}</p><p className="text-xs text-muted">{st.student_code}</p></TD>
                      <TD><Input name={`score:${st.id}`} type="number" min={0} max={a.max_marks} step="0.5" defaultValue={r?.score ?? ""} aria-label={`Score for ${st.full_name}`} /></TD>
                      <TD>{pctV === null ? "—" : <Badge tone={pctV >= Number(a.pass_pct) ? "green" : "red"}>{pctV >= Number(a.pass_pct) ? "Pass" : "Fail"} · {pctV.toFixed(0)}%</Badge>}</TD>
                      <TD><Input name={`feedback:${st.id}`} defaultValue={r?.feedback ?? ""} aria-label={`Feedback for ${st.full_name}`} /></TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <CardBody className="flex justify-end border-t border-line"><SubmitButton>Save results</SubmitButton></CardBody>
          </ActionForm>
        )}
      </Card>
    </>
  );
}
