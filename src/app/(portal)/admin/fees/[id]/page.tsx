import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DescriptionList, EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, ConfirmAction, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select, Textarea } from "@/components/ui/input";
import { applyWaiver, recordPayment, updateFeeTerms, voidPayment } from "@/lib/actions/finance";
import { fileUrl } from "@/lib/storage";
import { formatCurrency, formatDate, formatDateTime, humanize, todayInAcademy } from "@/lib/utils";

export const metadata = { title: "Fee account" };
const METHODS = ["cash", "upi", "bank_transfer", "card_pos", "cheque", "other"];

export default async function FeeDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const supabase = await createClient();
  const { data: f } = await supabase.from("fees").select("*, students(id, full_name, student_code), enrollments(batches(code), courses(name))").eq("id", id).maybeSingle();
  if (!f) notFound();
  const { data: payments } = await supabase.from("payment_records").select("*").eq("fee_id", id).order("paid_on", { ascending: false }).order("created_at", { ascending: false });
  const balance = Math.max(0, Number(f.total_amount) - Number(f.amount_paid) - Number(f.waived_amount));

  return (
    <>
      <PageHeader back={{ href: "/admin/fees", label: "Fees" }} title={`${f.students?.full_name} · fees`}
        description={<span className="flex items-center gap-2"><Link className="font-mono hover:underline" href={`/students/${f.students?.id}`}>{f.students?.student_code}</Link> · {f.enrollments?.courses?.name} ({f.enrollments?.batches?.code}) <StatusBadge status={f.status} /></span>}
        actions={balance > 0 && (
          <Dialog title="Record a payment" description="Record money already received. Never enter card numbers, CVV or bank passwords." trigger={<Button><Plus /> Record payment</Button>}>
            <ActionForm action={recordPayment} resetOnSuccess>
              <input type="hidden" name="fee_id" value={f.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Amount (₹)" name="amount" required hint={`Balance ${formatCurrency(balance)}`}><Input id="amount" name="amount" type="number" min={1} max={balance} step="1" defaultValue={balance} /></FormField>
                <FormField label="Payment date" name="paid_on" required><Input id="paid_on" name="paid_on" type="date" defaultValue={todayInAcademy()} /></FormField>
                <FormField label="Method" name="method"><Select id="method" name="method">{METHODS.map((m) => <option key={m} value={m}>{m === "upi" ? "UPI" : m === "card_pos" ? "Card (POS machine)" : humanize(m)}</option>)}</Select></FormField>
                <FormField label="Transaction / reference no." name="reference_number"><Input id="reference_number" name="reference_number" /></FormField>
              </div>
              <FormField label="Notes" name="notes"><Input id="notes" name="notes" /></FormField>
              <div className="flex justify-end"><SubmitButton>Save payment</SubmitButton></div>
            </ActionForm>
          </Dialog>
        )} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Summary" />
          <CardBody className="space-y-4">
            <Progress value={Number(f.total_amount) ? ((Number(f.amount_paid) + Number(f.waived_amount)) * 100) / Number(f.total_amount) : 100} tone={balance ? "brand" : "green"} />
            <DescriptionList cols={1} items={[
              ["Total course fee", formatCurrency(f.total_amount)], ["Amount paid", formatCurrency(f.amount_paid)],
              ["Waived", Number(f.waived_amount) ? <>{formatCurrency(f.waived_amount)}<span className="block text-xs text-muted">{f.waiver_reason}</span>{f.waiver_document_path && <a className="text-xs text-brand-600 hover:underline" href={fileUrl("admin-files", f.waiver_document_path)!}>Waiver document</a>}</> : "—"],
              ["Remaining balance", <span key="b" className="text-lg font-bold">{formatCurrency(balance)}</span>], ["Due date", formatDate(f.due_date)],
            ]} />
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Dialog title="Edit fee terms" trigger={<Button size="sm" variant="outline">Edit total / due date</Button>}>
                <ActionForm action={updateFeeTerms}>
                  <input type="hidden" name="fee_id" value={f.id} />
                  <FormField label="Total fee (₹)" name="total_amount"><Input id="total_amount" name="total_amount" type="number" min={0} defaultValue={f.total_amount} /></FormField>
                  <FormField label="Due date" name="due_date"><Input id="due_date" name="due_date" type="date" defaultValue={f.due_date ?? ""} /></FormField>
                  <div className="flex justify-end"><SubmitButton>Save</SubmitButton></div>
                </ActionForm>
              </Dialog>
              <Dialog title="Fee waiver" description="Waivers must be documented. They count towards certificate fee clearance." trigger={<Button size="sm" variant="outline">Waiver</Button>}>
                <ActionForm action={applyWaiver}>
                  <input type="hidden" name="fee_id" value={f.id} />
                  <FormField label="Waived amount (₹)" name="waived_amount" required hint="Set to 0 to remove a waiver"><Input id="waived_amount" name="waived_amount" type="number" min={0} defaultValue={f.waived_amount} /></FormField>
                  <FormField label="Reason / approval reference" name="waiver_reason" required><Textarea id="waiver_reason" name="waiver_reason" defaultValue={f.waiver_reason ?? ""} /></FormField>
                  <FormField label="Supporting document (optional)" name="document"><Input id="document" name="document" type="file" accept=".pdf,.png,.jpg,.jpeg" className="py-1.5" /></FormField>
                  <div className="flex justify-end"><SubmitButton>Apply waiver</SubmitButton></div>
                </ActionForm>
              </Dialog>
            </div>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Payment history" description="Payments cannot be edited or deleted. Void a wrong entry and record it again." />
          {!payments?.length ? <EmptyState title="No payments recorded" /> : (
            <Table>
              <THead><TR><TH>Receipt</TH><TH>Date</TH><TH>Amount</TH><TH>Method</TH><TH>Reference</TH><TH className="text-right">Actions</TH></TR></THead>
              <TBody>
                {payments.map((p) => (
                  <TR key={p.id} className={p.is_void ? "opacity-60" : ""}>
                    <TD className="font-mono text-xs">{p.receipt_number}{p.is_void && <Badge tone="red" className="ml-1">Void</Badge>}<span className="block font-sans text-muted">{formatDateTime(p.created_at)}</span></TD>
                    <TD className="whitespace-nowrap">{formatDate(p.paid_on)}</TD>
                    <TD className="font-semibold">{formatCurrency(p.amount)}</TD>
                    <TD>{p.method === "upi" ? "UPI" : humanize(p.method)}</TD>
                    <TD className="text-xs">{p.reference_number ?? "—"}{p.is_void && <span className="block text-red-600">{p.void_reason}</span>}</TD>
                    <TD>
                      <div className="flex justify-end gap-2">
                        {!p.is_void && <Button asChild size="sm" variant="outline"><a href={`/api/receipts/${p.id}`}><FileDown /> Receipt</a></Button>}
                        {!p.is_void && <ConfirmAction action={voidPayment} fields={{ id: p.id, fee_id: f.id }} label="Void" variant="ghost" title="Void this payment?" description="It will stay visible in history but stop counting towards the paid amount." confirmVariant="danger" reasonField={{ name: "void_reason", label: "Reason" }} />}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
