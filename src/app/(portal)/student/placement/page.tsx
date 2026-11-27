import Link from "next/link";
import { Building2 } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, InfoNote, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata = { title: "My placement" };

export default async function MyPlacement() {
  const user = await requireStudent();
  const supabase = await createClient();
  const [{ data: list }, { data: rounds }, { data: me }] = await Promise.all([
    supabase.rpc("my_placements"),
    supabase.from("placement_interviews").select("*").order("round_number"),
    supabase.from("students").select("skills, portfolio_url, resume_path").eq("id", user.studentId).single(),
  ]);
  return (
    <>
      <PageHeader title="My placement" description="Track your applications and interview rounds." actions={<Button asChild variant="outline"><Link href="/student/profile">Update resume & skills</Link></Button>} />
      <div className="mb-6"><InfoNote>The academy supports your job search with preparation and referrals. Placement outcomes depend on employers and are not guaranteed.</InfoNote></div>
      {(!me?.resume_path || !me?.skills?.length) && <div className="mb-6"><InfoNote tone="amber">Add your resume and skills to your profile so the placement team can match you with opportunities.</InfoNote></div>}
      {!list?.length ? <Card><EmptyState icon={Building2} title="No applications yet" /></Card> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((p) => (
            <Card key={p.id}>
              <CardHeader title={p.job_role} description={p.company} action={<StatusBadge status={p.status} />} />
              <CardBody className="space-y-2 text-sm">
                <p className="text-muted">Applied {formatDate(p.applied_on)} · updated {formatDate(p.updated_at)}</p>
                {p.offer_details && <p className="rounded-lg bg-emerald-50 p-2 text-emerald-800">Offer: {p.offer_details}</p>}
                {p.outcome && <p>Outcome: {p.outcome}</p>}
                <div className="space-y-1 border-t border-line pt-2">
                  {(rounds ?? []).filter((r) => r.placement_id === p.id).map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-xs"><span>Round {r.round_number}: {r.round_name} · {formatDateTime(r.scheduled_at)}</span><StatusBadge status={r.status} /></div>
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
