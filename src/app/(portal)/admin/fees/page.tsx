import Link from "next/link";
import { Download, Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { pageParams, searchTerm } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, Pagination, StatCard } from "@/components/ui/misc";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, humanize } from "@/lib/utils";

export const metadata = { title: "Fees" };

type SP = { q?: string; status?: string; page?: string };

export default async function FeesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const supabase = await createClient();
  const { page, pageSize, from, to } = pageParams(sp);
  let q = supabase.from("fees").select("*, students!inner(full_name, student_code), enrollments(batches(code), courses(name))", { count: "exact" }).order("due_date", { ascending: true, nullsFirst: false }).range(from, to);
  if (sp.status) q = q.eq("status", sp.status);
  const t = searchTerm(sp.q);
  if (t) q = q.or(`full_name.ilike.%${t}%,student_code.ilike.%${t}%`, { referencedTable: "students" });
  const [{ data, count }, { data: all }] = await Promise.all([q, supabase.from("fees").select("total_amount, amount_paid, waived_amount, status")]);
  const sum = (k: "total_amount" | "amount_paid" | "waived_amount") => (all ?? []).reduce((s, f) => s + Number(f[k]), 0);
  const outstanding = sum("total_amount") - sum("amount_paid") - sum("waived_amount");

  return (
    <>
      <PageHeader title="Fees & payments" description="Record payments, apply documented waivers and issue receipts. No card or bank credentials are stored."
        actions={<Button asChild variant="outline"><a href="/api/export/fees"><Download /> Export CSV</a></Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Billed" value={formatCurrency(sum("total_amount"))} icon={Wallet} />
        <StatCard label="Collected" value={formatCurrency(sum("amount_paid"))} tone="green" />
        <StatCard label="Outstanding" value={formatCurrency(outstanding)} tone="amber" />
        <StatCard label="Overdue accounts" value={(all ?? []).filter((f) => f.status === "overdue").length} tone="red" href="/admin/fees?status=overdue" />
      </div>
      <Card>
        <FilterBar q={sp.q} values={sp} placeholder="Student name or ID" filters={[{ name: "status", label: "Status", options: ["paid", "partially_paid", "pending", "overdue", "waived"].map((s) => ({ value: s, label: humanize(s) })) }]} />
        {!data?.length ? <EmptyState icon={Wallet} title="No fee records" /> : (
          <>
            <Table>
              <THead><TR><TH>Student</TH><TH>Course</TH><TH>Total</TH><TH>Paid</TH><TH>Balance</TH><TH>Due</TH><TH>Status</TH></TR></THead>
              <TBody>
                {data.map((f) => {
                  const bal = Number(f.total_amount) - Number(f.amount_paid) - Number(f.waived_amount);
                  return (
                    <TR key={f.id}>
                      <TD><Link href={`/admin/fees/${f.id}`} className="font-semibold text-brand-700 hover:underline">{f.students.full_name}</Link><p className="font-mono text-xs text-muted">{f.students.student_code}</p></TD>
                      <TD className="text-sm">{f.enrollments?.courses?.name}<span className="block text-xs text-muted">{f.enrollments?.batches?.code}</span></TD>
                      <TD>{formatCurrency(f.total_amount)}</TD><TD>{formatCurrency(f.amount_paid)}</TD>
                      <TD className={bal > 0 ? "font-semibold" : ""}>{formatCurrency(Math.max(0, bal))}</TD>
                      <TD className="whitespace-nowrap text-xs">{formatDate(f.due_date)}</TD>
                      <TD><StatusBadge status={f.status} /></TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={pageSize} total={count ?? 0} searchParams={sp} basePath="/admin/fees" />
          </>
        )}
      </Card>
    </>
  );
}
