import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { certificatePdf } from "@/lib/pdf";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/utils";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const supabase = await createClient();
  // RLS: admin, the student, or their trainer. Only approved certificates can be downloaded.
  const { data: c } = await supabase.from("certificates").select("*, students(full_name, student_code), courses(name)").eq("id", id).eq("status", "approved").maybeSingle();
  if (!c) return NextResponse.json({ error: "Certificate not found or not approved" }, { status: 404 });
  const { data: st } = await supabase.from("academy_settings").select("academy_name").eq("id", 1).single();
  const pdf = await certificatePdf({
    academy: st?.academy_name ?? "Briwon Academy", studentName: c.students?.full_name ?? "", studentCode: c.students?.student_code ?? "",
    courseName: c.courses?.name ?? "", completionDate: formatDate(c.completion_date), certificateNumber: c.certificate_number ?? "",
    grade: c.grade ?? "", signatoryName: c.signatory_name ?? "", signatoryTitle: c.signatory_title ?? "",
    verifyUrl: `${env.siteUrl}/verify/${c.verification_token}`,
  });
  return new NextResponse(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${c.certificate_number}.pdf"`, "Cache-Control": "private, no-store" } });
}
