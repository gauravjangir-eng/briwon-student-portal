import { Briefcase } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Placements" };

export default async function TrainerPlacements() {
  await requireRole("trainer");
  const supabase = await createClient();
  const { data } = await supabase.rpc("trainer_placement_overview");
  return (
    <>
      <PageHeader title="Placement progress" description="Status of your students' applications. Offer details are confidential and not shown here." />
      <Card>
        {!data?.length ? <EmptyState icon={Briefcase} title="No placement activity yet" /> : (
          <Table>
            <THead><TR><TH>Student</TH><TH>Company</TH><TH>Role</TH><TH>Status</TH><TH>Updated</TH></TR></THead>
            <TBody>{data.map((p) => <TR key={p.placement_id}><TD className="font-medium">{p.student_name}</TD><TD>{p.company}</TD><TD>{p.job_role}</TD><TD><StatusBadge status={p.status} /></TD><TD className="text-xs">{formatDate(p.updated_at)}</TD></TR>)}</TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
