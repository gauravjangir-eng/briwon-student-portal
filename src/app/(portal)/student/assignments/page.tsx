import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { currentEnrollment } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "My assignments" };

export default async function MyAssignments() {
  const user = await requireStudent();
  const supabase = await createClient();
  const en = await currentEnrollment(supabase, user.studentId);
  if (!en) return <><PageHeader title="Assignments" /><Card><EmptyState title="No active enrollment" /></Card></>;
  const [{ data: list }, { data: subs }] = await Promise.all([
    supabase.from("assignments").select("id, title, deadline, max_marks, is_required, modules(title)").eq("batch_id", en.batch_id).eq("status", "published").order("deadline", { ascending: false }),
    supabase.from("submissions").select("assignment_id, status, marks, is_late").eq("student_id", user.studentId),
  ]);
  const by = new Map((subs ?? []).map((s) => [s.assignment_id, s]));
  const done = (list ?? []).filter((a) => by.has(a.id)).length;
  return (
    <>
      <PageHeader title="My assignments" description={`${done} of ${list?.length ?? 0} submitted`} />
      <Card>
        {!list?.length ? <EmptyState icon={ClipboardList} title="No assignments yet" /> : (
          <Table>
            <THead><TR><TH>Assignment</TH><TH>Deadline</TH><TH>Marks</TH><TH>Status</TH></TR></THead>
            <TBody>
              {list.map((a) => {
                const s = by.get(a.id);
                const overdue = !s && new Date(a.deadline) < new Date();
                return (
                  <TR key={a.id}>
                    <TD><Link href={`/student/assignments/${a.id}`} className="font-semibold text-brand-700 hover:underline">{a.title}</Link><p className="text-xs text-muted">{a.modules?.title ?? ""}{a.is_required ? " · required" : " · optional"}</p></TD>
                    <TD className="whitespace-nowrap text-sm">{formatDateTime(a.deadline)}{overdue && <Badge tone="red" className="ml-1">Missed</Badge>}</TD>
                    <TD>{s?.marks != null ? `${s.marks}/${a.max_marks}` : "—"}</TD>
                    <TD>{s ? <><StatusBadge status={s.status} />{s.is_late && s.status !== "late" && <Badge tone="amber" className="ml-1">Late</Badge>}</> : <StatusBadge status={overdue ? "absent" : "assigned"} />}</TD>
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
