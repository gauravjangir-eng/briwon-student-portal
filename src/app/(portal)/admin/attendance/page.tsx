import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { CorrectionRequests, LeaveRequests } from "@/components/requests";

export const metadata = { title: "Corrections & leave" };

export default async function AdminAttendancePage() {
  await requireRole("admin");
  const supabase = await createClient();
  return (
    <>
      <PageHeader title="Attendance corrections & leave" description="Review requests from students and trainers." />
      <div className="space-y-6"><CorrectionRequests supabase={supabase} canReview /><LeaveRequests supabase={supabase} /></div>
    </>
  );
}
