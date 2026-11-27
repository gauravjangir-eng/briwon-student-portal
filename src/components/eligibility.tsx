import { CheckCircle2, CircleDashed } from "lucide-react";
import type { Eligibility } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import { cn, humanize, pct } from "@/lib/utils";

export function GradeBadge({ grade }: { grade: string }) {
  const tone = grade === "Distinction" ? "violet" : grade === "Merit" ? "blue" : grade === "Pass" ? "green" : "amber";
  return <Badge tone={tone}>{grade}</Badge>;
}

export function EligibilityCard({ e, title = "Certificate eligibility", action }: { e: Eligibility | null; title?: string; action?: React.ReactNode }) {
  if (!e) return null;
  const met = e.checks.filter((c) => c.met).length;
  return (
    <Card>
      <CardHeader title={title} description={`${met} of ${e.checks.length} requirements met · overall ${pct(e.overall_pct, 1)}`} action={<div className="flex items-center gap-2"><GradeBadge grade={e.grade} />{action}</div>} />
      <CardBody>
        <Progress value={(met * 100) / e.checks.length} tone={e.eligible ? "green" : "brand"} className="mb-5" />
        <ul className="grid gap-3 sm:grid-cols-2">
          {e.checks.map((c) => (
            <li key={c.key} className={cn("flex gap-3 rounded-xl border p-3", c.met ? "border-emerald-200 bg-emerald-50/60" : "border-line bg-white")}>
              {c.met ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-label="Met" /> : <CircleDashed className="mt-0.5 size-5 shrink-0 text-amber-500" aria-label="Missing" />}
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.label}</p>
                <p className={cn("text-xs", c.met ? "text-emerald-700" : "text-muted")}>{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-4">
          <Metric label="Attendance" value={pct(e.metrics.attendance.pct, 1)} />
          <Metric label="Assignments on time" value={pct(e.metrics.assignment_on_time_pct)} />
          <Metric label="Final assessment" value={e.metrics.final_assessment_pct == null ? "—" : pct(e.metrics.final_assessment_pct, 1)} />
          <Metric label="Fees" value={humanize(e.metrics.fee_status)} />
        </div>
      </CardBody>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted">{label}</p><p className="font-semibold">{value}</p></div>;
}
