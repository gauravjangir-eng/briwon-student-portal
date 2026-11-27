import Link from "next/link";
import { Download, UserPlus, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions, courseOptions, pageParams, searchTerm } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/misc";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, humanize, initials } from "@/lib/utils";
import { STUDENT_STATUSES } from "@/lib/validation";

export const metadata = { title: "Students" };

type SP = { q?: string; status?: string; course?: string; batch?: string; page?: string; archived?: string };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRole("admin", "trainer");
  const sp = await searchParams;
  const supabase = await createClient();
  const { page, pageSize, from, to } = pageParams(sp);
  const [courses, batches] = await Promise.all([courseOptions(supabase, false), batchOptions(supabase, user)]);

  const join = sp.course || sp.batch ? "enrollments!inner" : "enrollments";
  let q = supabase
    .from("students")
    .select(`id, student_code, full_name, email, phone, status, admission_date, profile_id, ${join}(status, batch_id, course_id, batches(code), courses(name))`, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  q = sp.archived === "1" ? q.not("archived_at", "is", null) : q.is("archived_at", null);
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.course) q = q.eq("enrollments.course_id", sp.course);
  if (sp.batch) q = q.eq("enrollments.batch_id", sp.batch);
  const t = searchTerm(sp.q);
  if (t) q = q.or(`full_name.ilike.%${t}%,email.ilike.%${t}%,student_code.ilike.%${t}%,phone.ilike.%${t}%`);
  const { data, count, error } = await q;

  const exportQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title={user.role === "admin" ? "Students" : "My students"}
        description={user.role === "admin" ? "Search, filter and open any student's 360° profile." : "Students in the batches assigned to you."}
        actions={user.role === "admin" && (
          <>
            <Button asChild variant="outline"><a href={`/api/export/students?${exportQs}`}><Download /> Export CSV</a></Button>
            <Button asChild><Link href="/admin/students/new"><UserPlus /> New admission</Link></Button>
          </>
        )}
      />
      <Card>
        <FilterBar
          q={sp.q}
          placeholder="Name, student ID, email or phone"
          values={sp}
          filters={[
            { name: "status", label: "Status", options: STUDENT_STATUSES.map((s) => ({ value: s, label: humanize(s) })) },
            { name: "course", label: "Course", options: courses.map((c) => ({ value: c.id, label: c.name })) },
            { name: "batch", label: "Batch", options: batches.map((b) => ({ value: b.id, label: b.code })) },
            ...(user.role === "admin" ? [{ name: "archived", label: "Records", options: [{ value: "1", label: "Archived only" }] }] : []),
          ]}
        />
        {error ? <p className="p-6 text-sm text-red-600">Could not load students.</p> : !data?.length ? (
          <EmptyState icon={Users} title="No students found" description={sp.q || sp.status || sp.course || sp.batch ? "Try clearing the filters." : "Admitted students will appear here."} />
        ) : (
          <>
            <Table>
              <THead><TR><TH>Student</TH><TH>Student ID</TH><TH>Course / batch</TH><TH>Phone</TH><TH>Admitted</TH><TH>Status</TH><TH>Account</TH></TR></THead>
              <TBody>
                {data.map((s) => {
                  const en = (s.enrollments ?? []).find((e) => e.status === "active") ?? s.enrollments?.[0];
                  return (
                    <TR key={s.id}>
                      <TD>
                        <Link href={`/students/${s.id}`} className="flex items-center gap-3 font-semibold text-ink hover:text-brand-600">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{initials(s.full_name)}</span>
                          <span className="min-w-0"><span className="block truncate">{s.full_name}</span><span className="block truncate text-xs font-normal text-muted">{s.email}</span></span>
                        </Link>
                      </TD>
                      <TD className="font-mono text-xs">{s.student_code}</TD>
                      <TD>{en ? <><span className="block">{en.courses?.name}</span><span className="text-xs text-muted">{en.batches?.code}</span></> : "—"}</TD>
                      <TD className="whitespace-nowrap">{s.phone}</TD>
                      <TD className="whitespace-nowrap">{formatDate(s.admission_date)}</TD>
                      <TD><StatusBadge status={s.status} /></TD>
                      <TD className="text-xs">{s.profile_id ? <span className="text-emerald-700">Active</span> : <span className="text-muted">Not set up</span>}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={pageSize} total={count ?? 0} searchParams={sp} basePath="/students" />
          </>
        )}
      </Card>
    </>
  );
}
