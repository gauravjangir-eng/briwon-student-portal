import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions, courseOptions } from "@/lib/queries";
import { PageHeader } from "@/components/ui/misc";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { AdmissionForm } from "./admission-form";

export const metadata = { title: "New admission" };

export default async function NewAdmissionPage() {
  const user = await requireRole("admin");
  const supabase = await createClient();
  const [courses, batches] = await Promise.all([courseOptions(supabase), batchOptions(supabase, user)]);
  return (
    <>
      <PageHeader back={{ href: "/students", label: "Students" }} title="New admission"
        description="Creates the student record, a unique Student ID, the enrollment and the fee record in one step." />
      <AdmissionForm
        courses={courses.map((c) => ({ id: c.id, name: c.name, fee: Number(c.fee_amount) }))}
        batches={batches.filter((b) => b.status === "planned" || b.status === "active").map((b) => ({ id: b.id, label: `${b.code} · ${b.name}`, course_id: b.course_id }))}
        canInvite={hasServiceRoleKey()}
      />
    </>
  );
}
