import { ActionForm, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select } from "@/components/ui/input";
import { saveAssessment } from "@/lib/actions/academics";

type A = { id: string; batch_id: string; title: string; assessment_date: string; max_marks: number; pass_pct: number; is_final: boolean };

export function AssessmentForm({ a, batches, defaultPass }: { a?: A; batches: { id: string; code: string }[]; defaultPass: number }) {
  return (
    <ActionForm action={saveAssessment} resetOnSuccess={!a}>
      {a && <input type="hidden" name="id" value={a.id} />}
      <FormField label="Batch" name="batch_id" required>
        <Select id="batch_id" name="batch_id" defaultValue={a?.batch_id ?? ""} disabled={!!a}><option value="" disabled>Select</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}</Select>
        {a && <input type="hidden" name="batch_id" value={a.batch_id} />}
      </FormField>
      <FormField label="Title" name="title" required><Input id="title" name="title" defaultValue={a?.title ?? "Final assessment"} /></FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Date" name="assessment_date" required><Input id="assessment_date" name="assessment_date" type="date" defaultValue={a?.assessment_date} /></FormField>
        <FormField label="Maximum marks" name="max_marks" required><Input id="max_marks" name="max_marks" type="number" min={1} defaultValue={a?.max_marks ?? 100} /></FormField>
        <FormField label="Pass mark (%)" name="pass_pct" required><Input id="pass_pct" name="pass_pct" type="number" min={0} max={100} defaultValue={a?.pass_pct ?? defaultPass} /></FormField>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_final" defaultChecked={a?.is_final ?? true} className="size-4 accent-brand-700" /> Counts as the final assessment for certificate eligibility</label>
      <div className="flex justify-end"><SubmitButton>{a ? "Save" : "Schedule assessment"}</SubmitButton></div>
    </ActionForm>
  );
}
