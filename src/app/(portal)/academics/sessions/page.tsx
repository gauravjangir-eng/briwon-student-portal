import Link from "next/link";
import { CalendarCheck, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions, pageParams } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/misc";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/client";
import { formatDate, formatTime, todayInAcademy } from "@/lib/utils";
import { SessionForm } from "./session-form";

export const metadata = { title: "Sessions & attendance" };

type SP = { batch?: string; when?: string; page?: string; date?: string };

export default async function SessionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRole("admin", "trainer");
  const sp = await searchParams;
  const supabase = await createClient();
  const batches = await batchOptions(supabase, user);
  const { page, pageSize, from, to } = pageParams(sp, 25);
  const when = sp.when ?? "today";
  const now = new Date().toISOString();
  const day = sp.date ?? todayInAcademy();
  const dayStart = new Date(`${day}T00:00:00+05:30`).toISOString();
  const dayEnd = new Date(`${day}T23:59:59+05:30`).toISOString();

  let q = supabase.from("class_sessions").select("id, title, starts_at, ends_at, status, location, batches(code), attendance(count)", { count: "exact" }).range(from, to);
  if (sp.batch) q = q.eq("batch_id", sp.batch);
  else if (user.role === "trainer") q = q.in("batch_id", batches.map((b) => b.id).concat("00000000-0000-0000-0000-000000000000"));
  if (when === "today") q = q.gte("starts_at", dayStart).lte("starts_at", dayEnd).order("starts_at");
  else if (when === "upcoming") q = q.gte("starts_at", now).order("starts_at");
  else q = q.lt("starts_at", now).order("starts_at", { ascending: false });
  const { data: sessions, count } = await q;

  return (
    <>
      <PageHeader title="Sessions & attendance" description="Scheduled classes. Open a session to mark or review attendance."
        actions={<Dialog title="Schedule a session" trigger={<Button><Plus /> New session</Button>}><SessionForm batches={batches} defaultBatch={sp.batch} /></Dialog>} />
      <Card>
        <div className="flex flex-wrap gap-1 border-b border-line px-4 pt-3">
          {[["today", "Today"], ["upcoming", "Upcoming"], ["past", "Past"]].map(([k, l]) => (
            <Link key={k} href={`/academics/sessions?when=${k}${sp.batch ? `&batch=${sp.batch}` : ""}`}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${when === k ? "border-brand-500 text-brand-700" : "border-transparent text-muted hover:text-ink"}`}>{l}</Link>
          ))}
        </div>
        <FilterBar values={sp} placeholder="(filter by batch or date)" filters={[{ name: "batch", label: "Batch", options: batches.map((b) => ({ value: b.id, label: b.code })) }]}
          extra={<><input type="hidden" name="when" value={when} />{when === "today" && <input type="date" name="date" defaultValue={day} aria-label="Date" className="h-10 rounded-lg border border-line px-3 text-sm" />}</>} />
        {!sessions?.length ? <EmptyState icon={CalendarCheck} title={when === "today" ? "No sessions on this day" : "No sessions found"} /> : (
          <>
            <Table>
              <THead><TR><TH>Date</TH><TH>Time</TH><TH>Batch</TH><TH>Session</TH><TH>Marked</TH><TH>Status</TH></TR></THead>
              <TBody>
                {sessions.map((s) => (
                  <TR key={s.id}>
                    <TD className="whitespace-nowrap">{formatDate(s.starts_at)}</TD>
                    <TD className="whitespace-nowrap">{formatTime(s.starts_at)}–{formatTime(s.ends_at)}</TD>
                    <TD>{s.batches?.code}</TD>
                    <TD><Link href={`/academics/sessions/${s.id}`} className="font-medium text-brand-700 hover:underline">{s.title}</Link>{s.location && <span className="block text-xs text-muted">{s.location}</span>}</TD>
                    <TD>{(s.attendance as unknown as { count: number }[])[0]?.count ?? 0}</TD>
                    <TD><StatusBadge status={s.status} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={pageSize} total={count ?? 0} searchParams={{ ...sp, when }} basePath="/academics/sessions" />
          </>
        )}
      </Card>
    </>
  );
}
