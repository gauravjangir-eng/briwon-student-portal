import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightLeft, FileText, Mail, Pencil, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions, eligibilityFor } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DescriptionList, EmptyState, PageHeader } from "@/components/ui/misc";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ActionForm, ConfirmAction, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select, Textarea } from "@/components/ui/input";
import { EligibilityCard } from "@/components/eligibility";
import { fileUrl } from "@/lib/storage";
import { formatCurrency, formatDate, formatDateTime, humanize, initials } from "@/lib/utils";
import { STUDENT_STATUSES } from "@/lib/validation";
import { inviteStudent, setAccountActive, setStudentArchived, updateStudent, uploadStudentDocument, verifyDocument } from "@/lib/actions/admin";
import { enrollStudent, setEnrollmentStatus, transferStudent } from "@/lib/actions/catalog";

export const metadata = { title: "Student profile" };

export default async function StudentProfile({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("admin", "trainer");
  const { id } = await params;
  const supabase = await createClient();
  const isAdmin = user.role === "admin";

  const { data: s } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();

  const [{ data: enrollments }, { data: subs }, { data: projects }, { data: results }, { data: fees }, { data: docs }, { data: internships }, { data: placements }, { data: profile }, batches] = await Promise.all([
    supabase.from("enrollments").select("id, status, enrolled_on, ended_on, notes, batch_id, course_id, transferred_from, batches(code, name), courses(name, fee_amount)").eq("student_id", id).order("created_at", { ascending: false }),
    supabase.from("submissions").select("id, status, marks, is_late, submitted_at, assignments(id, title, max_marks, deadline, is_required)").eq("student_id", id).order("submitted_at", { ascending: false }),
    supabase.from("project_submissions").select("id, status, marks, presentation_status, projects(title, kind, max_marks)").eq("student_id", id),
    supabase.from("assessment_results").select("id, score, assessments(title, max_marks, is_final, assessment_date)").eq("student_id", id),
    isAdmin ? supabase.from("fees").select("id, total_amount, amount_paid, waived_amount, status, due_date, enrollment_id").eq("student_id", id) : Promise.resolve({ data: null }),
    isAdmin ? supabase.from("student_documents").select("*").eq("student_id", id).order("created_at", { ascending: false }) : Promise.resolve({ data: null }),
    supabase.from("internships").select("id, title, organization, status, progress_pct").eq("student_id", id),
    isAdmin ? supabase.from("placements").select("id, company, job_role, status, updated_at").eq("student_id", id) : Promise.resolve({ data: null }),
    isAdmin && s.profile_id ? supabase.from("profiles").select("is_active").eq("id", s.profile_id).maybeSingle() : Promise.resolve({ data: null }),
    isAdmin ? batchOptions(supabase, user) : Promise.resolve([]),
  ]);

  const active = (enrollments ?? []).find((e) => e.status === "active") ?? (enrollments ?? []).find((e) => e.status === "completed");
  const elig = active ? await eligibilityFor(supabase, active.id) : null;

  return (
    <>
      <PageHeader
        back={{ href: "/students", label: "Students" }}
        title={s.full_name}
        description={<span className="flex flex-wrap items-center gap-2"><span className="font-mono">{s.student_code}</span><StatusBadge status={s.status} />{s.archived_at && <Badge tone="red">Archived</Badge>}</span>}
        actions={isAdmin && (
          <>
            {!s.profile_id && (
              <ActionForm action={inviteStudent}><input type="hidden" name="id" value={s.id} /><SubmitButton variant="accent" pendingText="Sending…"><Mail /> {s.invited_at ? "Resend invite" : "Send account invite"}</SubmitButton></ActionForm>
            )}
            {s.profile_id && profile && (
              <ConfirmAction action={setAccountActive} fields={{ profile_id: s.profile_id, active: String(!profile.is_active) }} size="md"
                label={profile.is_active ? "Disable portal access" : "Enable portal access"} title={profile.is_active ? "Disable portal access?" : "Enable portal access?"}
                description="Records are not affected. The student just cannot sign in while access is disabled." confirmVariant={profile.is_active ? "danger" : "primary"} />
            )}
            <Dialog wide title="Edit student" trigger={<Button variant="outline"><Pencil /> Edit</Button>}>
              <ActionForm action={updateStudent}>
                <input type="hidden" name="id" value={s.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Full name" name="full_name" required><Input id="full_name" name="full_name" defaultValue={s.full_name} /></FormField>
                  <FormField label="Email" name="email" required hint={s.profile_id ? "Changing this does not change the sign-in email." : undefined}><Input id="email" name="email" type="email" defaultValue={s.email} /></FormField>
                  <FormField label="Phone" name="phone" required><Input id="phone" name="phone" defaultValue={s.phone} /></FormField>
                  <FormField label="Date of birth" name="date_of_birth"><Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={s.date_of_birth ?? ""} /></FormField>
                  <FormField label="Emergency contact" name="emergency_contact_name"><Input id="emergency_contact_name" name="emergency_contact_name" defaultValue={s.emergency_contact_name ?? ""} /></FormField>
                  <FormField label="Emergency phone" name="emergency_contact_phone"><Input id="emergency_contact_phone" name="emergency_contact_phone" defaultValue={s.emergency_contact_phone ?? ""} /></FormField>
                  <FormField label="Status" name="status"><Select id="status" name="status" defaultValue={s.status}>{STUDENT_STATUSES.map((v) => <option key={v} value={v}>{humanize(v)}</option>)}</Select></FormField>
                </div>
                <FormField label="Address" name="address"><Textarea id="address" name="address" defaultValue={s.address ?? ""} /></FormField>
                <div className="flex justify-end"><SubmitButton>Save changes</SubmitButton></div>
              </ActionForm>
            </Dialog>
            <ConfirmAction action={setStudentArchived} fields={{ id: s.id, archive: String(!s.archived_at) }} size="md" variant="ghost"
              label={s.archived_at ? "Restore" : "Archive"} title={s.archived_at ? "Restore this student?" : "Archive this student?"}
              description="Archiving hides the student from active lists. Attendance, marks, fees and certificates are preserved." confirmVariant={s.archived_at ? "primary" : "danger"} />
          </>
        )}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardBody>
            <div className="flex items-center gap-4">
              <span className="grid size-16 place-items-center rounded-2xl bg-brand-700 text-xl font-bold text-white">{initials(s.full_name)}</span>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{s.full_name}</p>
                <p className="truncate text-sm text-muted">{s.email}</p>
                <p className="text-xs text-muted">{s.profile_id ? "Portal account active" : s.invited_at ? `Invited ${formatDate(s.invited_at)}` : "No portal account yet"}</p>
              </div>
            </div>
            <div className="mt-6">
              <DescriptionList cols={1} items={[
                ["Phone", s.phone], ["Admission date", formatDate(s.admission_date)], ["Date of birth", formatDate(s.date_of_birth)],
                ["Address", s.address], ["Emergency contact", s.emergency_contact_name ? `${s.emergency_contact_name} · ${s.emergency_contact_phone ?? ""}` : null],
                ["Skills", s.skills?.length ? s.skills.join(", ") : null],
                ["Portfolio", s.portfolio_url ? <a className="text-brand-600 hover:underline" href={s.portfolio_url} target="_blank" rel="noreferrer noopener">{s.portfolio_url}</a> : null],
                ["Resume", s.resume_path ? <a className="text-brand-600 hover:underline" href={fileUrl("student-files", s.resume_path)!}>Download</a> : null],
              ]} />
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Enrollments" description="Course and batch history, including transfers"
              action={isAdmin && (
                <Dialog title="Enroll in another course" trigger={<Button size="sm" variant="outline"><Plus /> Enroll</Button>}>
                  <ActionForm action={enrollStudent}>
                    <input type="hidden" name="student_id" value={s.id} />
                    <FormField label="Batch" name="batch_id" required>
                      <Select id="batch_id" name="batch_id" required defaultValue="">
                        <option value="" disabled>Select a batch</option>
                        {batches.filter((b) => b.status !== "completed" && b.status !== "cancelled").map((b) => <option key={b.id} value={b.id}>{b.code} · {b.courses?.name}</option>)}
                      </Select>
                    </FormField>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Course fee (₹)" name="fee_amount" required><Input id="fee_amount" name="fee_amount" type="number" min={0} step="1" /></FormField>
                      <FormField label="Fee due date" name="fee_due"><Input id="fee_due" name="fee_due" type="date" /></FormField>
                    </div>
                    <div className="flex justify-end"><SubmitButton>Enroll student</SubmitButton></div>
                  </ActionForm>
                </Dialog>
              )} />
            {!enrollments?.length ? <EmptyState title="No enrollments" /> : (
              <Table>
                <THead><TR><TH>Course</TH><TH>Batch</TH><TH>Enrolled</TH><TH>Status</TH>{isAdmin && <TH className="text-right">Actions</TH>}</TR></THead>
                <TBody>
                  {enrollments.map((e) => (
                    <TR key={e.id}>
                      <TD className="font-medium">{e.courses?.name}</TD>
                      <TD>{e.batches?.code}</TD>
                      <TD className="whitespace-nowrap">{formatDate(e.enrolled_on)}{e.ended_on && <span className="block text-xs text-muted">to {formatDate(e.ended_on)}</span>}</TD>
                      <TD><StatusBadge status={e.status} />{e.transferred_from && <span className="mt-1 block text-xs text-muted">via transfer</span>}</TD>
                      {isAdmin && (
                        <TD className="text-right">
                          {e.status === "active" && (
                            <div className="flex justify-end gap-2">
                              <Dialog title="Transfer to another batch" description="The current enrollment is kept as history and the fee record moves to the new batch." trigger={<Button size="sm" variant="outline"><ArrowRightLeft /> Transfer</Button>}>
                                <ActionForm action={transferStudent}>
                                  <input type="hidden" name="enrollment_id" value={e.id} /><input type="hidden" name="student_id" value={s.id} />
                                  <FormField label="New batch (same course)" name="batch_id" required>
                                    <Select id="batch_id" name="batch_id" defaultValue="">
                                      <option value="" disabled>Select a batch</option>
                                      {batches.filter((b) => b.course_id === e.course_id && b.id !== e.batch_id && b.status !== "completed" && b.status !== "cancelled").map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}
                                    </Select>
                                  </FormField>
                                  <FormField label="Reason" name="reason" required><Textarea id="reason" name="reason" /></FormField>
                                  <div className="flex justify-end"><SubmitButton>Transfer</SubmitButton></div>
                                </ActionForm>
                              </Dialog>
                              <ConfirmAction action={setEnrollmentStatus} fields={{ id: e.id, student_id: s.id, status: "withdrawn" }} label="Withdraw" variant="ghost"
                                title="Withdraw from this course?" description="The record is kept for history and fees." confirmVariant="danger" />
                            </div>
                          )}
                        </TD>
                      )}
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>

          <EligibilityCard e={elig} title="Progress scorecard" action={isAdmin && active && <Button asChild size="sm" variant="outline"><Link href={`/admin/certificates?enrollment=${active.id}`}>Certificates</Link></Button>} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Assignments" description={`${subs?.length ?? 0} submission(s)`} />
          {!subs?.length ? <EmptyState title="No submissions yet" /> : (
            <Table>
              <THead><TR><TH>Assignment</TH><TH>Submitted</TH><TH>Marks</TH><TH>Status</TH></TR></THead>
              <TBody>
                {subs.map((x) => (
                  <TR key={x.id}>
                    <TD><Link className="font-medium hover:text-brand-600" href={`/academics/assignments/${x.assignments?.id}`}>{x.assignments?.title}</Link></TD>
                    <TD className="whitespace-nowrap text-xs">{formatDateTime(x.submitted_at)}{x.is_late && <Badge tone="amber" className="ml-1">Late</Badge>}</TD>
                    <TD>{x.marks ?? "—"} / {x.assignments?.max_marks}</TD>
                    <TD><StatusBadge status={x.status} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title="Projects & assessments" />
          <CardBody className="space-y-2">
            {!projects?.length && !results?.length && <p className="text-sm text-muted">Nothing yet.</p>}
            {projects?.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
                <div className="min-w-0"><p className="truncate font-medium">{p.projects?.title}</p><p className="text-xs text-muted">{p.projects?.kind === "capstone" ? "Capstone" : "Mini-project"} · presentation {humanize(p.presentation_status).toLowerCase()}</p></div>
                <div className="flex items-center gap-2"><span className="font-semibold">{p.marks ?? "—"}/{p.projects?.max_marks}</span><StatusBadge status={p.status} /></div>
              </div>
            ))}
            {results?.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
                <div><p className="font-medium">{r.assessments?.title}</p><p className="text-xs text-muted">{r.assessments?.is_final ? "Final assessment" : "Assessment"} · {formatDate(r.assessments?.assessment_date)}</p></div>
                <span className="font-semibold">{r.score}/{r.assessments?.max_marks}</span>
              </div>
            ))}
          </CardBody>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader title="Fees" action={<Button asChild size="sm" variant="outline"><Link href={`/admin/fees?q=${encodeURIComponent(s.student_code ?? "")}`}>Manage</Link></Button>} />
            <CardBody className="space-y-3">
              {!fees?.length && <p className="text-sm text-muted">No fee records.</p>}
              {fees?.map((f) => (
                <Link key={f.id} href={`/admin/fees/${f.id}`} className="flex items-center justify-between rounded-xl border border-line p-3 text-sm hover:bg-brand-50/50">
                  <span>{formatCurrency(f.amount_paid)} paid of {formatCurrency(f.total_amount)}{Number(f.waived_amount) > 0 && ` · ${formatCurrency(f.waived_amount)} waived`}</span>
                  <StatusBadge status={f.status} />
                </Link>
              ))}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title="Internship & placement" />
          <CardBody className="space-y-2 text-sm">
            {internships?.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-xl border border-line p-3">
                <span><span className="font-medium">{i.title}</span> <span className="text-muted">· {i.organization} · {i.progress_pct}%</span></span><StatusBadge status={i.status} />
              </div>
            ))}
            {placements?.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-line p-3">
                <span><span className="font-medium">{p.job_role}</span> <span className="text-muted">· {p.company}</span></span><StatusBadge status={p.status} />
              </div>
            ))}
            {!internships?.length && !placements?.length && <p className="text-muted">No internship or placement records yet.</p>}
          </CardBody>
        </Card>

        {isAdmin && (
          <Card className="lg:col-span-2">
            <CardHeader title="Documents" description="Private files. Only admins and the student can open them."
              action={
                <Dialog title="Upload document" trigger={<Button size="sm" variant="outline"><Plus /> Upload</Button>}>
                  <ActionForm action={uploadStudentDocument}>
                    <input type="hidden" name="student_id" value={s.id} />
                    <FormField label="Document type" name="doc_type">
                      <Select id="doc_type" name="doc_type">{["id_proof", "address_proof", "photo", "education", "admission_form", "other"].map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</Select>
                    </FormField>
                    <FormField label="File" name="file" hint="PDF, PNG, JPG or WEBP up to 10 MB"><Input id="file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="py-1.5" /></FormField>
                    <div className="flex justify-end"><SubmitButton>Upload</SubmitButton></div>
                  </ActionForm>
                </Dialog>
              } />
            {!docs?.length ? <EmptyState icon={FileText} title="No documents uploaded" /> : (
              <Table>
                <THead><TR><TH>Type</TH><TH>File</TH><TH>Uploaded</TH><TH>Verified</TH></TR></THead>
                <TBody>
                  {docs.map((d) => (
                    <TR key={d.id}>
                      <TD>{humanize(d.doc_type)}</TD>
                      <TD><a className="text-brand-600 hover:underline" href={fileUrl("student-files", d.file_path)!}>{d.file_name}</a> <span className="text-xs text-muted">({Math.round(d.size_bytes / 1024)} KB)</span></TD>
                      <TD className="text-xs">{formatDateTime(d.created_at)}</TD>
                      <TD>{d.verified ? <Badge tone="green">Verified</Badge> : <ActionForm action={verifyDocument}><input type="hidden" name="id" value={d.id} /><SubmitButton size="sm" variant="outline">Mark verified</SubmitButton></ActionForm>}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
