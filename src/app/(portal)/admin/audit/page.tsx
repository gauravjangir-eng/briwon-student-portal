import { History } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { pageParams } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/misc";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, humanize } from "@/lib/utils";

export const metadata = { title: "Audit log" };

const ENTITIES = ["students", "enrollments", "attendance", "submissions", "fees", "payment_records", "certificates", "academy_settings", "profiles", "trainers", "batches", "placements", "student_documents", "auth_user"];

function summary(details: unknown) {
  const d = details as { changes?: Record<string, { from: unknown; to: unknown }> };
  if (d?.changes) return Object.entries(d.changes).slice(0, 4).map(([k, v]) => `${k}: ${JSON.stringify(v.from)} → ${JSON.stringify(v.to)}`).join(" · ");
  return "";
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ entity?: string; page?: string; action?: string }> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const supabase = await createClient();
  const { page, pageSize, from, to } = pageParams(sp, 30);
  let q = supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (sp.entity) q = q.eq("entity", sp.entity);
  if (sp.action) q = q.eq("action", sp.action);
  const { data, count } = await q;
  const actorIds = [...new Set((data ?? []).map((d) => d.actor_id).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds) : { data: [] };
  const name = new Map((actors ?? []).map((a) => [a.id, a.full_name || a.email]));
  return (
    <>
      <PageHeader title="Audit log" description="Who changed what, and when. Records cannot be edited or deleted from the portal." />
      <Card>
        <FilterBar values={sp} placeholder="(filter below)" filters={[
          { name: "entity", label: "Record", options: ENTITIES.map((e) => ({ value: e, label: humanize(e) })) },
          { name: "action", label: "Action", options: ["insert", "update", "delete", "invite"].map((a) => ({ value: a, label: humanize(a) })) },
        ]} />
        {!data?.length ? <EmptyState icon={History} title="No audit entries" /> : (
          <>
            <Table>
              <THead><TR><TH>When</TH><TH>Who</TH><TH>Action</TH><TH>Record</TH><TH>Changes</TH></TR></THead>
              <TBody>
                {data.map((l) => (
                  <TR key={l.id}>
                    <TD className="whitespace-nowrap text-xs">{formatDateTime(l.created_at)}</TD>
                    <TD className="text-sm">{l.actor_id ? name.get(l.actor_id) ?? "User" : <span className="text-muted">System</span>}</TD>
                    <TD><Badge tone={l.action === "delete" ? "red" : l.action === "insert" ? "green" : "blue"}>{humanize(l.action)}</Badge></TD>
                    <TD className="text-xs">{humanize(l.entity)}<span className="block font-mono text-muted">{l.entity_id?.slice(0, 18)}</span></TD>
                    <TD className="max-w-md truncate text-xs text-muted" title={summary(l.details)}>{summary(l.details)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={pageSize} total={count ?? 0} searchParams={sp} basePath="/admin/audit" />
          </>
        )}
      </Card>
    </>
  );
}
