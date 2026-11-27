import { cn, humanize } from "@/lib/utils";

const tones = {
  gray: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-brand-50 text-brand-700 ring-brand-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
} as const;
export type Tone = keyof typeof tones;

const STATUS_TONES: Record<string, Tone> = {
  active: "green", present: "green", approved: "green", paid: "green", completed: "green", joined: "green", selected: "green",
  offer_received: "green", passed: "green", done: "green", ongoing: "blue", published: "blue", submitted: "blue", scheduled: "blue",
  under_review: "violet", interviewing: "violet", interview_scheduled: "violet", in_progress: "blue", applied: "blue",
  late: "amber", pending: "amber", partially_paid: "amber", revision_required: "amber", planned: "gray", preparing: "gray",
  pending_approval: "amber", waived: "violet", excused: "violet", inactive: "gray", graduated: "blue", draft: "gray", todo: "gray",
  absent: "red", overdue: "red", rejected: "red", withdrawn: "red", suspended: "red", cancelled: "red", revoked: "red",
  failed: "red", not_placed: "gray", archived: "gray", transferred: "gray", not_required: "gray", terminated: "red",
  new: "blue", contacted: "blue", follow_up: "amber", visited: "violet", converted: "green", lost: "gray",
};

export function Badge({ children, tone = "gray", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  if (!status) return <Badge className={className}>—</Badge>;
  return <Badge tone={STATUS_TONES[status] ?? "gray"} className={className}>{humanize(status)}</Badge>;
}
