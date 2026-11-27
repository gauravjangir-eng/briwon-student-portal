import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions, courseOptions } from "@/lib/queries";
import { PageHeader } from "@/components/ui/misc";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { AdmissionForm, type AdmissionInitial } from "./admission-form";
import { InfoNote } from "@/components/ui/misc";

export const metadata = { title: "New admission" };

export default async function NewAdmissionPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const user = await requireRole("admin");
  const supabase = await createClient();
  const { lead: leadId } = await searchParams;
  const [courses, batches, lead] = await Promise.all([
    courseOptions(supabase), batchOptions(supabase, user),
    leadId && /^[0-9a-f-]{36}$/i.test(leadId)
      ? supabase.from("leads").select("id, full_name, email, phone, course_id, status").eq("id", leadId).maybeSingle().then((r) => r.data)
      : Promise.resolve(null),
  ]);
  const initial: AdmissionInitial | undefined = lead && lead.status !== "converted"
    ? { lead_id: lead.id, full_name: lead.full_name, email: lead.email, phone: lead.phone, course_id: lead.course_id } : undefined;
  return (
    <>
      <PageHeader back={{ href: "/students", label: "Students" }} title="New admission"
        description="Creates the student record, a unique Student ID, the enrollment and the fee record in one step." />
      {initial && <div className="mb-6"><InfoNote>Filled in from the enquiry for {initial.full_name}. Admitting will mark that enquiry as converted.</InfoNote></div>}
      <AdmissionForm
        courses={courses.map((c) => ({ id: c.id, name: c.name, fee: Number(c.fee_amount) }))}
        batches={batches.filter((b) => b.status === "planned" || b.status === "active").map((b) => ({ id: b.id, label: `${b.code} · ${b.name}`, course_id: b.course_id }))}
        canInvite={hasServiceRoleKey()}
        initial={initial}
      />
    </>
  );
}
