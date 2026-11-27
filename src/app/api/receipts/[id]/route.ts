import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { receiptPdf } from "@/lib/pdf";
import { formatCurrency, formatDate, formatDateTime, humanize } from "@/lib/utils";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  // RLS: admins, or the student who owns the fee record
  const { data: p } = await supabase.from("payment_records")
    .select("*, fees(total_amount, amount_paid, waived_amount, students(full_name, student_code), enrollments(courses(name)))")
    .eq("id", id).eq("is_void", false).maybeSingle();
  if (!p || !p.fees) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  const { data: st } = await supabase.from("academy_settings").select("academy_name").eq("id", 1).single();
  const f = p.fees;
  const pdf = await receiptPdf({
    academy: st?.academy_name ?? "Briwon Academy", receiptNumber: p.receipt_number ?? "", paidOn: formatDate(p.paid_on),
    studentName: f.students?.full_name ?? "", studentCode: f.students?.student_code ?? "", course: f.enrollments?.courses?.name ?? "",
    amount: formatCurrency(p.amount).replace("₹", "INR "), method: p.method === "upi" ? "UPI" : humanize(p.method), reference: p.reference_number ?? "",
    totalFee: formatCurrency(f.total_amount).replace("₹", "INR "), paidToDate: formatCurrency(f.amount_paid).replace("₹", "INR "),
    balance: formatCurrency(Math.max(0, Number(f.total_amount) - Number(f.amount_paid) - Number(f.waived_amount))).replace("₹", "INR "),
    recordedAt: formatDateTime(p.created_at),
  });
  return new NextResponse(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${p.receipt_number}.pdf"`, "Cache-Control": "private, no-store" } });
}
