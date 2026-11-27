import { Check, X } from "lucide-react";
import type { Supa } from "@/lib/queries";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/ui/client";
import { reviewCorrection, reviewLeave } from "@/lib/actions/academics";
import { formatDate, formatDateTime, humanize } from "@/lib/utils";

export async function LeaveRequests({ supabase }: { supabase: Supa }) {
  const { data } = await supabase.from("leave_requests").select("*, students(full_name, student_code)").order("status").order("created_at", { ascending: false }).limit(100);
  return (
    <Card>
      <CardHeader title="Leave requests" description="Approve or reject student leave" />
      {!data?.length ? <EmptyState title="No leave requests" /> : (
        <Table>
          <THead><TR><TH>Student</TH><TH>Dates</TH><TH>Reason</TH><TH>Status</TH><TH className="text-right">Review</TH></TR></THead>
          <TBody>
            {data.map((l) => (
              <TR key={l.id}>
                <TD><p className="font-medium">{l.students?.full_name}</p><p className="text-xs text-muted">{l.students?.student_code}</p></TD>
                <TD className="whitespace-nowrap text-xs">{formatDate(l.start_date)} – {formatDate(l.end_date)}</TD>
                <TD className="max-w-xs text-sm">{l.reason}{l.review_note && <p className="text-xs text-muted">Note: {l.review_note}</p>}</TD>
                <TD><StatusBadge status={l.status} /></TD>
                <TD>
                  {l.status === "pending" && (
                    <div className="flex justify-end gap-2">
                      <ConfirmAction action={reviewLeave} fields={{ id: l.id, status: "approved" }} label={<><Check className="size-4" /> Approve</>} title="Approve leave?" description="Mark the matching sessions as Excused in the register if needed." reasonField={undefined} />
                      <ConfirmAction action={reviewLeave} fields={{ id: l.id, status: "rejected" }} label={<X className="size-4" />} variant="ghost" title="Reject leave?" confirmVariant="danger" confirmLabel="Reject" />
                    </div>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

export async function CorrectionRequests({ supabase, canReview }: { supabase: Supa; canReview: boolean }) {
  const { data } = await supabase.from("attendance_correction_requests")
    .select("*, students(full_name, student_code), class_sessions(title, starts_at, batches(code))")
    .order("status").order("created_at", { ascending: false }).limit(100);
  return (
    <Card>
      <CardHeader title="Attendance correction requests" description={canReview ? "Approving applies the change and records it in the attendance history." : "Corrections are approved by an admin."} />
      {!data?.length ? <EmptyState title="No correction requests" /> : (
        <Table>
          <THead><TR><TH>Student</TH><TH>Session</TH><TH>Requested</TH><TH>Reason</TH><TH>Status</TH>{canReview && <TH className="text-right">Review</TH>}</TR></THead>
          <TBody>
            {data.map((r) => (
              <TR key={r.id}>
                <TD><p className="font-medium">{r.students?.full_name}</p><p className="text-xs text-muted">{r.students?.student_code}</p></TD>
                <TD className="text-xs">{r.class_sessions?.batches?.code}<br />{formatDateTime(r.class_sessions?.starts_at)}</TD>
                <TD><StatusBadge status={r.requested_status} /></TD>
                <TD className="max-w-xs text-sm">{r.reason}{r.review_note && <p className="text-xs text-muted">Note: {r.review_note}</p>}</TD>
                <TD><StatusBadge status={r.status} /></TD>
                {canReview && (
                  <TD>
                    {r.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <ConfirmAction action={reviewCorrection} fields={{ id: r.id, approve: "true" }} label={<><Check className="size-4" /> Approve</>} title={`Change to ${humanize(r.requested_status)}?`} />
                        <ConfirmAction action={reviewCorrection} fields={{ id: r.id, approve: "false" }} label={<X className="size-4" />} variant="ghost" title="Reject correction?" confirmVariant="danger" confirmLabel="Reject" reasonField={{ name: "note", label: "Reason for rejection" }} />
                      </div>
                    )}
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
