import Link from "next/link";
import { Download, Plus, UserRoundSearch } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { courseOptions, pageParams, searchTerm } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, Pagination, StatCard } from "@/components/ui/misc";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/client";
import { formatDate, humanize, todayInAcademy } from "@/lib/utils";
import { LEAD_OPEN_STATUSES, LEAD_SOURCES, LEAD_STATUSES } from "@/lib/validation";
import { LeadForm } from "./lead-form";

export const metadata = { title: "Enquiries" };

type SP = { q?: string; status?: string; source?: string; course?: string; due?: string; page?: string };
const OPEN = `(${LEAD_OPEN_STATUSES.join(",")})`;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const supabase = await createClient();
  const today = todayInAcademy();
  const { page, pageSize, from, to } = pageParams(sp);

  let q = supabase.from("leads").select("id, full_name, phone, email, city, source, status, next_follow_up, created_at, courses(name)", { count: "exact" })
    .order("next_follow_up", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).range(from, to);
  if (sp.status && (LEAD_STATUSES as readonly string[]).includes(sp.status)) q = q.eq("status", sp.status);
  if (sp.source && (LEAD_SOURCES as readonly string[]).includes(sp.source)) q = q.eq("source", sp.source);
  if (sp.course && /^[0-9a-f-]{36}$/i.test(sp.course)) q = q.eq("course_id", sp.course);
  if (sp.due === "1") q = q.lte("next_follow_up", today).filter("status", "in", OPEN);
  const t = searchTerm(sp.q);
  if (t) q = q.or(`full_name.ilike.%${t}%,phone.ilike.%${t}%,email.ilike.%${t}%,city.ilike.%${t}%`);

  const [{ data, count }, { data: all }, courses] = await Promise.all([
    q, supabase.from("leads").select("status, next_follow_up"), courseOptions(supabase),
  ]);
  const rows = all ?? [];
  const isOpen = (s: string) => (LEAD_OPEN_STATUSES as readonly string[]).includes(s);
  const open = rows.filter((r) => isOpen(r.status)).length;
  const due = rows.filter((r) => isOpen(r.status) && r.next_follow_up && r.next_follow_up <= today).length;
  const converted = rows.filter((r) => r.status === "converted").length;
  const closed = converted + rows.filter((r) => r.status === "lost").length;

  return (
    <>
      <PageHeader title="Enquiries" description="Track admission enquiries from first contact to admission."
        actions={<>
          <Button asChild variant="outline"><a href="/api/export/leads" download><Download /> Export CSV</a></Button>
          <Dialog wide title="Add enquiry" trigger={<Button><Plus /> Add enquiry</Button>}><LeadForm courses={courses} /></Dialog>
        </>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open enquiries" value={open} icon={UserRoundSearch} />
        <StatCard label="Follow-ups due" value={due} hint="Today or overdue" tone={due ? "amber" : "brand"} href="/admin/leads?due=1" />
        <StatCard label="Converted" value={converted} tone="green" href="/admin/leads?status=converted" />
        <StatCard label="Conversion rate" value={closed ? `${Math.round((converted / closed) * 100)}%` : "—"} hint="Of closed enquiries" tone="violet" />
      </div>
      <Card>
        <FilterBar q={sp.q} values={sp} placeholder="Name, phone, email or city" filters={[
          { name: "status", label: "Status", options: LEAD_STATUSES.map((s) => ({ value: s, label: humanize(s) })) },
          { name: "source", label: "Source", options: LEAD_SOURCES.map((s) => ({ value: s, label: humanize(s) })) },
          { name: "course", label: "Course", options: courses.map((c) => ({ value: c.id, label: c.name })) },
        ]} extra={sp.due === "1" ? <input type="hidden" name="due" value="1" /> : undefined} />
        {!data?.length ? <EmptyState icon={UserRoundSearch} title={sp.due === "1" ? "No follow-ups due" : "No enquiries found"} description="Add an enquiry when someone calls, visits or fills the website form." /> : (
          <>
            <Table>
              <THead><TR><TH>Name</TH><TH>Interested in</TH><TH>Source</TH><TH>Next follow-up</TH><TH>Status</TH></TR></THead>
              <TBody>
                {data.map((l) => {
                  const overdue = isOpen(l.status) && l.next_follow_up && l.next_follow_up < today;
                  const dueToday = isOpen(l.status) && l.next_follow_up === today;
                  return (
                    <TR key={l.id}>
                      <TD><Link href={`/admin/leads/${l.id}`} className="font-semibold text-brand-700 hover:underline">{l.full_name}</Link><p className="text-xs text-muted">{l.phone}{l.city && ` · ${l.city}`}</p></TD>
                      <TD className="text-sm">{l.courses?.name ?? <span className="text-muted">Not decided</span>}</TD>
                      <TD className="text-sm">{humanize(l.source)}</TD>
                      <TD className="whitespace-nowrap text-xs">
                        {isOpen(l.status) && l.next_follow_up ? <>{formatDate(l.next_follow_up)}{overdue && <Badge tone="red" className="ml-2">Overdue</Badge>}{dueToday && <Badge tone="amber" className="ml-2">Today</Badge>}</> : "—"}
                      </TD>
                      <TD><StatusBadge status={l.status} /></TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={pageSize} total={count ?? 0} searchParams={sp} basePath="/admin/leads" />
          </>
        )}
      </Card>
    </>
  );
}
