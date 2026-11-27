import { Award, FileDown, ShieldCheck } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { currentEnrollment, eligibilityFor } from "@/lib/queries";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, InfoNote, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { EligibilityCard, GradeBadge } from "@/components/eligibility";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My certificate" };

export default async function MyCertificate() {
  const user = await requireStudent();
  const supabase = await createClient();
  const en = await currentEnrollment(supabase, user.studentId);
  if (!en) return <><PageHeader title="Certificate" /><Card><EmptyState title="No active enrollment" /></Card></>;
  const [elig, { data: cert }] = await Promise.all([
    eligibilityFor(supabase, en.id),
    supabase.from("certificates").select("*").eq("enrollment_id", en.id).maybeSingle(),
  ]);
  return (
    <>
      <PageHeader title="Certificate" description={en.courses?.name ?? ""} />
      {cert?.status === "approved" ? (
        <Card className="mb-6 overflow-hidden">
          <div className="brand-gradient flex flex-wrap items-center justify-between gap-4 p-6 text-white">
            <div className="flex items-center gap-4">
              <span className="grid size-14 place-items-center rounded-2xl bg-white/15"><Award className="size-7" /></span>
              <div><p className="text-sm text-brand-200">Certificate issued</p><p className="text-xl font-bold">{cert.certificate_number}</p><p className="text-sm text-brand-100">Completed {formatDate(cert.completion_date)} · {cert.grade}</p></div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="accent"><a href={`/api/certificates/${cert.id}`}><FileDown /> Download PDF</a></Button>
              <Button asChild variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20"><a href={`/verify/${cert.verification_token}`} target="_blank" rel="noreferrer"><ShieldCheck /> Verification page</a></Button>
            </div>
          </div>
        </Card>
      ) : cert?.status === "revoked" ? (
        <div className="mb-6"><InfoNote tone="amber">Your certificate was revoked: {cert.revoked_reason}. Please contact the academy.</InfoNote></div>
      ) : elig?.eligible ? (
        <div className="mb-6"><InfoNote>All requirements are met. Your certificate is waiting for approval by the academy.</InfoNote></div>
      ) : (
        <Card className="mb-6"><CardBody className="flex items-center gap-3"><GradeBadge grade="Not Yet Complete" /><p className="text-sm text-muted">Complete the remaining requirements below to become eligible.</p></CardBody></Card>
      )}
      <EligibilityCard e={elig} title="Eligibility checklist" />
      <p className="mt-4 text-xs text-muted">Grades: Distinction 85%+, Merit 70–84%, Pass 50–69%. The overall score combines assignments, projects and the final assessment. Any missing requirement shows “Not Yet Complete”.</p>
    </>
  );
}
