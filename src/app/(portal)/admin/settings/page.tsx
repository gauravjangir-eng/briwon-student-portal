import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { settings } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { ActionForm, FormField, SubmitButton } from "@/components/ui/client";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { saveSettings } from "@/lib/actions/admin";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Academy settings" };

function N({ label, name, value, hint, step = "1", min = 0, max }: { label: string; name: string; value: number | string | null; hint?: string; step?: string; min?: number; max?: number }) {
  return <FormField label={label} name={name} hint={hint}><Input id={name} name={name} type="number" step={step} min={min} max={max} defaultValue={value ?? ""} /></FormField>;
}

export default async function SettingsPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const [s, { data: history }] = await Promise.all([settings(supabase), supabase.from("academy_settings_history").select("id, changed_at, changed_by").order("changed_at", { ascending: false }).limit(10)]);
  return (
    <>
      <PageHeader title="Academy settings" description="Policies used across the portal. Every change is saved to the policy history." />
      <ActionForm action={saveSettings} className="space-y-6">
        <Card>
          <CardHeader title="Academy" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <FormField label="Academy name" name="academy_name" required><Input id="academy_name" name="academy_name" defaultValue={s.academy_name} /></FormField>
            <FormField label="Support email" name="support_email"><Input id="support_email" name="support_email" type="email" defaultValue={s.support_email ?? ""} /></FormField>
            <FormField label="Certificate signatory name" name="certificate_signatory_name" required><Input id="certificate_signatory_name" name="certificate_signatory_name" defaultValue={s.certificate_signatory_name} /></FormField>
            <FormField label="Signatory title" name="certificate_signatory_title" required><Input id="certificate_signatory_title" name="certificate_signatory_title" defaultValue={s.certificate_signatory_title} /></FormField>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="GPS check-in" description="Students can check in only within this radius of the campus. Find coordinates by right-clicking the campus in Google Maps." />
          <CardBody className="grid gap-4 sm:grid-cols-4">
            <N label="Campus latitude" name="campus_latitude" value={s.campus_latitude} step="0.000001" min={-90} max={90} />
            <N label="Campus longitude" name="campus_longitude" value={s.campus_longitude} step="0.000001" min={-180} max={180} />
            <N label="Allowed radius (m)" name="campus_radius_m" value={s.campus_radius_m} min={10} />
            <N label="Max GPS accuracy (m)" name="max_gps_accuracy_m" value={s.max_gps_accuracy_m} min={5} hint="Reject readings less precise than this" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Attendance rules" description="Minutes after class start. Defaults: 0–14 Present, 15–30 Late, 31+ Absent." />
          <CardBody className="grid gap-4 sm:grid-cols-4">
            <N label="Check-in opens (min before)" name="checkin_opens_before_min" value={s.checkin_opens_before_min} />
            <N label="Present until (min)" name="present_until_min" value={s.present_until_min} />
            <N label="Late until (min)" name="late_until_min" value={s.late_until_min} min={1} />
            <N label="Late counts as (0–1)" name="late_attendance_weight" value={s.late_attendance_weight} step="0.05" max={1} hint="1 = full, 0.5 = half, 0 = none" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Certificate eligibility" />
          <CardBody className="grid gap-4 sm:grid-cols-4">
            <N label="Min attendance (%)" name="min_attendance_pct" value={s.min_attendance_pct} step="0.5" max={100} />
            <N label="Assignments on time (%)" name="min_on_time_assignments_pct" value={s.min_on_time_assignments_pct} step="0.5" max={100} />
            <N label="Min score per assignment (%)" name="min_assignment_score_pct" value={s.min_assignment_score_pct} step="0.5" max={100} />
            <N label="Late grace period (days)" name="late_submission_grace_days" value={s.late_submission_grace_days} max={60} />
            <label className="flex items-center gap-2 self-end pb-2 text-sm sm:col-span-2"><input type="checkbox" name="late_within_grace_counts" defaultChecked={s.late_within_grace_counts} className="size-4 accent-brand-700" /> Late submissions within the grace period count as on time</label>
            <N label="Required mini-projects" name="required_mini_projects" value={s.required_mini_projects} max={20} />
            <N label="Min capstone score (/100)" name="min_capstone_score_pct" value={s.min_capstone_score_pct} step="0.5" max={100} />
            <N label="Min final assessment (%)" name="min_final_assessment_pct" value={s.min_final_assessment_pct} step="0.5" max={100} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Grading" description="Overall % = weighted assignments + projects + final assessment. Weights must add up to 100." />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <N label="Weight: assignments" name="weight_assignments" value={s.weight_assignments} max={100} />
            <N label="Weight: projects" name="weight_projects" value={s.weight_projects} max={100} />
            <N label="Weight: final assessment" name="weight_final_assessment" value={s.weight_final_assessment} max={100} />
            <N label="Distinction from (%)" name="grade_distinction_pct" value={s.grade_distinction_pct} max={100} />
            <N label="Merit from (%)" name="grade_merit_pct" value={s.grade_merit_pct} max={100} />
            <N label="Pass from (%)" name="grade_pass_pct" value={s.grade_pass_pct} max={100} />
          </CardBody>
        </Card>
        <div className="flex justify-end"><SubmitButton size="lg">Save settings</SubmitButton></div>
      </ActionForm>
      <Card className="mt-6">
        <CardHeader title="Policy history" description="Previous versions are kept so eligibility decisions can be audited. Issued certificates store the exact snapshot they were approved with." />
        <Table><THead><TR><TH>Changed</TH><TH>Version id</TH></TR></THead>
          <TBody>{(history ?? []).map((h) => <TR key={h.id}><TD>{formatDateTime(h.changed_at)}</TD><TD className="font-mono text-xs">#{h.id}</TD></TR>)}</TBody></Table>
        {!history?.length && <p className="p-5 text-sm text-muted">No changes yet.</p>}
      </Card>
    </>
  );
}
