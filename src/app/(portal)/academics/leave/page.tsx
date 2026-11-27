import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { CorrectionRequests, LeaveRequests } from "@/components/requests";

export const metadata = { title: "Leave & corrections" };

export default async function LeavePage() {
  const user = await requireRole("admin", "trainer");
  const supabase = await createClient();
  return (
    <>
      <PageHeader title="Leave & attendance corrections" description="Requests from students in your batches." />
      <div className="space-y-6"><LeaveRequests supabase={supabase} /><CorrectionRequests supabase={supabase} canReview={user.role === "admin"} /></div>
    </>
  );
}
