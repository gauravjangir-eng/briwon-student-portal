import { ActionForm, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select, Textarea } from "@/components/ui/input";
import { saveProject } from "@/lib/actions/academics";
import { isoToAcademyInput } from "@/lib/utils";

type P = { id: string; batch_id: string; kind: string; sequence: number; title: string; instructions: string | null; deadline: string; max_marks: number; requires_presentation: boolean };

export function ProjectForm({ p, batches }: { p?: P; batches: { id: string; code: string }[] }) {
  return (
    <ActionForm action={saveProject} resetOnSuccess={!p}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Batch" name="batch_id" required>
          <Select id="batch_id" name="batch_id" defaultValue={p?.batch_id ?? ""} disabled={!!p}>
            <option value="" disabled>Select</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
          </Select>
          {p && <input type="hidden" name="batch_id" value={p.batch_id} />}
        </FormField>
        <FormField label="Type" name="kind"><Select id="kind" name="kind" defaultValue={p?.kind ?? "mini"}><option value="mini">Mini-project</option><option value="capstone">Capstone</option></Select></FormField>
        <FormField label="Number" name="sequence" hint="Mini-projects 1–4"><Input id="sequence" name="sequence" type="number" min={1} defaultValue={p?.sequence ?? 1} /></FormField>
      </div>
      <FormField label="Title" name="title" required><Input id="title" name="title" defaultValue={p?.title} /></FormField>
      <FormField label="Instructions" name="instructions"><Textarea id="instructions" name="instructions" defaultValue={p?.instructions ?? ""} /></FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Deadline (IST)" name="deadline" required><Input id="deadline" name="deadline" type="datetime-local" defaultValue={p ? isoToAcademyInput(p.deadline) : ""} /></FormField>
        <FormField label="Maximum marks" name="max_marks" required><Input id="max_marks" name="max_marks" type="number" min={1} defaultValue={p?.max_marks ?? 100} /></FormField>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requires_presentation" defaultChecked={p?.requires_presentation ?? false} className="size-4 accent-brand-700" /> Requires a presentation (always on for capstones)</label>
      <div className="flex justify-end"><SubmitButton>{p ? "Save project" : "Create project"}</SubmitButton></div>
    </ActionForm>
  );
}
