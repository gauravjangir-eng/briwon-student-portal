import Link from "next/link";
import { Award, FileDown, ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions, eligibilityFor, pageParams } from "@/lib/queries";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader, Pagination, Progress } from "@/components/ui/misc";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, ConfirmAction, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Input } from "@/components/ui/input";
import { EligibilityCard, GradeBadge } from "@/components/eligibility";
import { approveCertificate, revokeCertificate } from "@/lib/actions/outcomes";
import { formatDate, pct, todayInAcademy } from "@/lib/utils";

export const metadata = { title: "Certificates" };

type SP = { batch?: string; page?: string; enrollment?: string };

export default async function CertificatesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRole("admin");
  const sp = await searchParams;
  const supabase = await createClient();
  const batches = await batchOptions(supabase, user);
  const { page, pageSize, from, to } = pageParams(sp, 15);

  let q = supabase.from("enrollments").select("id, status, students(id, full_name, student_code), batches(code), courses(name), certificates(id, status, certificate_number, grade, verification_token)", { count: "exact" })
    .in("status", ["active", "completed"]).order("created_at").range(from, to);
  if (sp.batch) q = q.eq("batch_id", sp.batch);
  if (sp.enrollment) q = q.eq("id", sp.enrollment);
  const { data: enrollments, count } = await q;
  const rows = await Promise.all((enrollments ?? []).map(async (e) => ({ e, elig: await eligibilityFor(supabase, e.id) })));
  const focus = sp.enrollment ? rows[0] : null;

  return (
    <>
      <PageHeader title="Certificates" description="Eligibility is calculated automatically from attendance, assignments, projects, assessments and fees. Issuing always needs admin approval." />
      {focus?.elig && <div className="mb-6"><EligibilityCard e={focus.elig} title={`${focus.e.students?.full_name} · ${focus.e.courses?.name}`} /></div>}
      <Card>
        <FilterBar values={sp} placeholder="(filter by batch)" filters={[{ name: "batch", label: "Batch", options: batches.map((b) => ({ value: b.id, label: b.code })) }]} />
        {!rows.length ? <EmptyState icon={Award} title="No enrollments to show" /> : (
          <>
            <Table>
              <THead><TR><TH>Student</TH><TH>Course / batch</TH><TH>Requirements</TH><TH>Overall</TH><TH>Grade</TH><TH>Certificate</TH><TH className="text-right">Action</TH></TR></THead>
              <TBody>
                {rows.map(({ e, elig }) => {
                  const cert = e.certificates;
                  const met = elig ? elig.checks.filter((c) => c.met).length : 0;
                  const missing = elig ? elig.checks.filter((c) => !c.met).map((c) => c.label) : [];
                  return (
                    <TR key={e.id}>
                      <TD><Link href={`/admin/certificates?enrollment=${e.id}`} className="font-semibold text-brand-700 hover:underline">{e.students?.full_name}</Link><p className="font-mono text-xs text-muted">{e.students?.student_code}</p></TD>
                      <TD className="text-sm">{e.courses?.name}<span className="block text-xs text-muted">{e.batches?.code}</span></TD>
                      <TD className="min-w-40">
                        <span className="text-xs">{met}/8 met</span><Progress value={(met * 100) / 8} className="mt-1 h-1.5" tone={met === 8 ? "green" : "brand"} />
                        {!!missing.length && <p className="mt-1 line-clamp-2 text-xs text-muted" title={missing.join("\n")}>Missing: {missing.join("; ")}</p>}
                      </TD>
                      <TD>{elig ? pct(elig.overall_pct, 1) : "—"}</TD>
                      <TD>{elig && <GradeBadge grade={elig.grade} />}</TD>
                      <TD>{cert ? <><StatusBadge status={cert.status} /><p className="font-mono text-xs text-muted">{cert.certificate_number}</p></> : <span className="text-xs text-muted">Not issued</span>}</TD>
                      <TD>
                        <div className="flex justify-end gap-2">
                          {cert?.status === "approved" ? (
                            <>
                              <Button asChild size="sm" variant="outline"><a href={`/api/certificates/${cert.id}`}><FileDown /> PDF</a></Button>
                              <Button asChild size="sm" variant="ghost" aria-label="Open verification page"><a href={`/verify/${cert.verification_token}`} target="_blank" rel="noreferrer"><ExternalLink /></a></Button>
                              <ConfirmAction action={revokeCertificate} fields={{ id: cert.id }} label="Revoke" variant="ghost" title="Revoke this certificate?" confirmVariant="danger" reasonField={{ name: "reason", label: "Reason" }} />
                            </>
                          ) : elig?.eligible ? (
                            <Dialog title={`Approve certificate · ${e.students?.full_name}`} description={`Grade ${elig.grade} · overall ${pct(elig.overall_pct, 1)}. A certificate number and QR verification link will be generated.`} trigger={<Button size="sm" variant="success"><Award /> Approve</Button>}>
                              <ActionForm action={approveCertificate}>
                                <input type="hidden" name="enrollment_id" value={e.id} />
                                <FormField label="Completion date" name="completion_date"><Input id="completion_date" name="completion_date" type="date" defaultValue={todayInAcademy()} /></FormField>
                                <div className="flex justify-end"><SubmitButton variant="success">Approve & issue</SubmitButton></div>
                              </ActionForm>
                            </Dialog>
                          ) : <span className="text-xs text-muted">Not Yet Complete</span>}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={pageSize} total={count ?? 0} searchParams={sp} basePath="/admin/certificates" />
          </>
        )}
      </Card>
      <IssuedList />
    </>
  );
}

async function IssuedList() {
  const supabase = await createClient();
  const { data } = await supabase.from("certificates").select("id, certificate_number, status, grade, completion_date, approved_at, students(full_name), courses(name)").neq("status", "pending_approval").order("approved_at", { ascending: false }).limit(20);
  if (!data?.length) return null;
  return (
    <Card className="mt-6">
      <CardHeader title="Recently issued" />
      <Table>
        <THead><TR><TH>Certificate no.</TH><TH>Student</TH><TH>Course</TH><TH>Grade</TH><TH>Completed</TH><TH>Status</TH></TR></THead>
        <TBody>
          {data.map((c) => (
            <TR key={c.id}><TD className="font-mono text-xs">{c.certificate_number}</TD><TD>{c.students?.full_name}</TD><TD className="text-sm">{c.courses?.name}</TD><TD>{c.grade && <GradeBadge grade={c.grade} />}</TD><TD className="text-xs">{formatDate(c.completion_date)}</TD><TD><StatusBadge status={c.status} /></TD></TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
