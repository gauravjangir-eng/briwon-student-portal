import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/client";
import { formatDateTime } from "@/lib/utils";
import { AssignmentForm } from "./assignment-form";

export const metadata = { title: "Assignments" };

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ q?: string; batch?: string; status?: string }> }) {
  const user = await requireRole("admin", "trainer");
  const sp = await searchParams;
  const supabase = await createClient();
  const batches = await batchOptions(supabase, user);
  const courseIds = [...new Set(batches.map((b) => b.course_id))];
  const { data: modules } = await supabase.from("modules").select("id, title, course_id, position").in("course_id", courseIds.length ? courseIds : ["00000000-0000-0000-0000-000000000000"]).order("position");

  let q = supabase.from("assignments").select("id, title, deadline, max_marks, is_required, status, batch_id, batches(code), submissions(status)").order("deadline", { ascending: false });
  if (sp.batch) q = q.eq("batch_id", sp.batch);
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.q) q = q.ilike("title", `%${sp.q.replace(/[%,()]/g, "")}%`);
  const { data } = await q;
  const { data: enr } = await supabase.from("enrollments").select("batch_id").eq("status", "active");
  const perBatch = (enr ?? []).reduce<Record<string, number>>((m, e) => ((m[e.batch_id] = (m[e.batch_id] ?? 0) + 1), m), {});

  return (
    <>
      <PageHeader title="Assignments" description="Create assignments, follow submissions and review work."
        actions={<Dialog wide title="New assignment" trigger={<Button><Plus /> New assignment</Button>}><AssignmentForm batches={batches} modules={modules ?? []} /></Dialog>} />
      <Card>
        <FilterBar q={sp.q} values={sp} placeholder="Search assignment titles" filters={[
          { name: "batch", label: "Batch", options: batches.map((b) => ({ value: b.id, label: b.code })) },
          { name: "status", label: "Status", options: ["published", "draft", "archived"].map((s) => ({ value: s, label: s[0]!.toUpperCase() + s.slice(1) })) },
        ]} />
        {!data?.length ? <EmptyState icon={ClipboardList} title="No assignments" description="Create the first assignment for a batch." /> : (
          <Table>
            <THead><TR><TH>Assignment</TH><TH>Batch</TH><TH>Deadline</TH><TH>Submitted</TH><TH>To review</TH><TH>Status</TH></TR></THead>
            <TBody>
              {data.map((a) => {
                const subs = a.submissions ?? [];
                const toReview = subs.filter((s) => ["submitted", "late", "under_review"].includes(s.status)).length;
                const past = new Date(a.deadline) < new Date();
                return (
                  <TR key={a.id}>
                    <TD><Link href={`/academics/assignments/${a.id}`} className="font-semibold text-brand-700 hover:underline">{a.title}</Link><p className="text-xs text-muted">{a.max_marks} marks{a.is_required ? " · required" : " · optional"}</p></TD>
                    <TD>{a.batches?.code}</TD>
                    <TD className="whitespace-nowrap text-xs">{formatDateTime(a.deadline)}{past && <Badge className="ml-1">Closed</Badge>}</TD>
                    <TD>{subs.length}/{perBatch[a.batch_id] ?? 0}</TD>
                    <TD>{toReview ? <Badge tone="amber">{toReview}</Badge> : "—"}</TD>
                    <TD><StatusBadge status={a.status} /></TD>
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
