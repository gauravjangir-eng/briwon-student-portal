import { ActionForm, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select, Textarea } from "@/components/ui/input";
import { saveLead } from "@/lib/actions/leads";
import { LEAD_SOURCES } from "@/lib/validation";
import { humanize } from "@/lib/utils";

export type LeadFormValues = {
  id?: string; full_name?: string; phone?: string; email?: string | null; city?: string | null;
  course_id?: string | null; source?: string; next_follow_up?: string | null; notes?: string | null;
};

export function LeadForm({ lead, courses }: { lead?: LeadFormValues; courses: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveLead} resetOnSuccess={!lead?.id}>
      {lead?.id && <input type="hidden" name="id" value={lead.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name" name="full_name" required><Input id="full_name" name="full_name" defaultValue={lead?.full_name} autoComplete="off" /></FormField>
        <FormField label="Phone" name="phone" required><Input id="phone" name="phone" type="tel" defaultValue={lead?.phone} placeholder="+91 98xxx xxxxx" /></FormField>
        <FormField label="Email" name="email"><Input id="email" name="email" type="email" defaultValue={lead?.email ?? ""} /></FormField>
        <FormField label="City" name="city"><Input id="city" name="city" defaultValue={lead?.city ?? ""} /></FormField>
        <FormField label="Interested in" name="course_id">
          <Select id="course_id" name="course_id" defaultValue={lead?.course_id ?? ""}>
            <option value="">Not decided</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Source" name="source" required>
          <Select id="source" name="source" defaultValue={lead?.source ?? "walk_in"}>
            {LEAD_SOURCES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
          </Select>
        </FormField>
        <FormField label="Next follow-up" name="next_follow_up"><Input id="next_follow_up" name="next_follow_up" type="date" defaultValue={lead?.next_follow_up ?? ""} /></FormField>
        <FormField label="Notes" name="notes" className="sm:col-span-2"><Textarea id="notes" name="notes" defaultValue={lead?.notes ?? ""} className="min-h-20" /></FormField>
      </div>
      <div className="flex justify-end"><SubmitButton>{lead?.id ? "Save" : "Add enquiry"}</SubmitButton></div>
    </ActionForm>
  );
}
