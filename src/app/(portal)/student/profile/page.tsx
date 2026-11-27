import QRCode from "qrcode";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { currentEnrollment } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { ActionForm, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Textarea } from "@/components/ui/input";
import { BrandMark } from "@/components/layout/brand";
import { updateMyProfile } from "@/lib/actions/student";
import { fileUrl } from "@/lib/storage";
import { formatDate, initials } from "@/lib/utils";

export const metadata = { title: "My profile" };

export default async function MyProfile() {
  const user = await requireStudent();
  const supabase = await createClient();
  const [{ data: s }, en] = await Promise.all([supabase.from("students").select("*").eq("id", user.studentId).single(), currentEnrollment(supabase, user.studentId)]);
  if (!s) return null;
  const qr = await QRCode.toDataURL(s.student_code ?? "", { margin: 1, width: 160, color: { dark: "#244879", light: "#ffffff" } });
  return (
    <>
      <PageHeader title="My profile" description="Your student ID card and contact details." />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="brand-gradient relative overflow-hidden rounded-2xl p-6 text-white shadow-xl">
            <div className="grid-pattern absolute inset-0" aria-hidden />
            <div className="relative">
              <div className="flex items-center gap-2"><BrandMark className="size-8" /><span className="text-sm font-bold">Briwon Academy</span><span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-brand-200">Student ID</span></div>
              <div className="mt-6 flex items-center gap-4">
                <span className="grid size-16 place-items-center rounded-2xl bg-white/15 text-xl font-bold">{initials(s.full_name)}</span>
                <div className="min-w-0"><p className="truncate text-lg font-bold">{s.full_name}</p><p className="truncate text-sm text-brand-100">{en?.courses?.name}</p><p className="text-xs text-brand-200">{en?.batches?.code}</p></div>
              </div>
              <div className="mt-6 flex items-end justify-between gap-4">
                <div><p className="text-[10px] uppercase tracking-[0.18em] text-brand-200">ID number</p><p className="font-mono text-xl font-bold">{s.student_code}</p><p className="mt-1 text-xs text-brand-200">Admitted {formatDate(s.admission_date)}</p></div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt={`QR code for ${s.student_code}`} className="size-20 rounded-lg bg-white p-1" />
              </div>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">Status <StatusBadge status={s.status} /></p>
        </div>
        <Card className="lg:col-span-3">
          <CardHeader title="Contact & career details" description="Name, email and course details are managed by the academy." />
          <CardBody>
            <ActionForm action={updateMyProfile}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Phone" name="phone" required><Input id="phone" name="phone" defaultValue={s.phone} /></FormField>
                <FormField label="Email" name="email" hint="Contact the office to change"><Input id="email" value={s.email} disabled readOnly /></FormField>
                <FormField label="Emergency contact" name="emergency_contact_name"><Input id="emergency_contact_name" name="emergency_contact_name" defaultValue={s.emergency_contact_name ?? ""} /></FormField>
                <FormField label="Emergency phone" name="emergency_contact_phone"><Input id="emergency_contact_phone" name="emergency_contact_phone" defaultValue={s.emergency_contact_phone ?? ""} /></FormField>
              </div>
              <FormField label="Address" name="address"><Textarea id="address" name="address" defaultValue={s.address ?? ""} className="min-h-16" /></FormField>
              <FormField label="Skills" name="skills" hint="Comma separated, e.g. React, SQL, Figma"><Input id="skills" name="skills" defaultValue={s.skills.join(", ")} /></FormField>
              <FormField label="Portfolio URL" name="portfolio_url"><Input id="portfolio_url" name="portfolio_url" type="url" placeholder="https://" defaultValue={s.portfolio_url ?? ""} /></FormField>
              <FormField label="Resume" name="resume" hint={s.resume_path ? "A resume is on file. Upload a new one to replace it." : "PDF or Word, up to 10 MB"}>
                <Input id="resume" name="resume" type="file" accept=".pdf,.doc,.docx" className="py-1.5" />
              </FormField>
              {s.resume_path && <a className="text-sm text-brand-600 hover:underline" href={fileUrl("student-files", s.resume_path)!}>Download current resume</a>}
              <div className="flex justify-end"><SubmitButton>Save profile</SubmitButton></div>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
