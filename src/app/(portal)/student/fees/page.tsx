import { FileDown, Wallet } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, humanize } from "@/lib/utils";

export const metadata = { title: "My fees" };

export default async function MyFees() {
  const user = await requireStudent();
  const supabase = await createClient();
  const { data: fees } = await supabase.from("fees").select("*, enrollments(courses(name), batches(code)), payment_records(*)").eq("student_id", user.studentId);
  if (!fees?.length) return <><PageHeader title="Fees" /><Card><EmptyState icon={Wallet} title="No fee records" /></Card></>;
  return (
    <>
      <PageHeader title="My fees" description="Payments are recorded by the academy office. Download a receipt for any payment." />
      <div className="space-y-6">
        {fees.map((f) => {
          const bal = Math.max(0, Number(f.total_amount) - Number(f.amount_paid) - Number(f.waived_amount));
          const payments = (f.payment_records ?? []).filter((p) => !p.is_void).sort((a, b) => b.paid_on.localeCompare(a.paid_on));
          return (
            <Card key={f.id}>
              <CardHeader title={f.enrollments?.courses?.name ?? "Course fee"} description={f.enrollments?.batches?.code} action={<StatusBadge status={f.status} />} />
              <CardBody className="space-y-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[["Total fee", formatCurrency(f.total_amount)], ["Paid", formatCurrency(f.amount_paid)], ["Waived", formatCurrency(f.waived_amount)], ["Balance", formatCurrency(bal)]].map(([k, v]) => <div key={k}><p className="text-xs text-muted">{k}</p><p className="text-lg font-bold">{v}</p></div>)}
                </div>
                <Progress value={Number(f.total_amount) ? ((Number(f.amount_paid) + Number(f.waived_amount)) * 100) / Number(f.total_amount) : 100} tone={bal ? "brand" : "green"} />
                {bal > 0 && f.due_date && <p className="text-sm text-muted">Due by {formatDate(f.due_date)}. Fees must be cleared (or officially waived) for your certificate.</p>}
              </CardBody>
              {!!payments.length && (
                <Table>
                  <THead><TR><TH>Receipt</TH><TH>Date</TH><TH>Amount</TH><TH>Method</TH><TH className="text-right">Download</TH></TR></THead>
                  <TBody>{payments.map((p) => (
                    <TR key={p.id}><TD className="font-mono text-xs">{p.receipt_number}</TD><TD>{formatDate(p.paid_on)}</TD><TD className="font-semibold">{formatCurrency(p.amount)}</TD><TD>{p.method === "upi" ? "UPI" : humanize(p.method)}</TD>
                      <TD className="text-right"><Button asChild size="sm" variant="outline"><a href={`/api/receipts/${p.id}`}><FileDown /> Receipt</a></Button></TD></TR>
                  ))}</TBody>
                </Table>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
