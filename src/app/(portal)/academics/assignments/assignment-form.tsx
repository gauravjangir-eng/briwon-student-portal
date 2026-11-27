import { ActionForm, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select, Textarea } from "@/components/ui/input";
import { saveAssignment } from "@/lib/actions/academics";
import { isoToAcademyInput, todayInAcademy } from "@/lib/utils";

type A = { id: string; batch_id: string; module_id: string | null; title: string; description: string | null; instructions: string | null; assigned_on: string; deadline: string; max_marks: number; is_required: boolean; submission_types: string[]; late_policy: string; status: string };
const TYPES: [string, string][] = [["text", "Text"], ["file", "File upload"], ["url", "External URL"], ["project_link", "Project link"]];

export function AssignmentForm({ a, batches, modules }: { a?: A; batches: { id: string; code: string; course_id: string }[]; modules: { id: string; title: string; course_id: string; position: number }[] }) {
  return (
    <ActionForm action={saveAssignment} resetOnSuccess={!a}>
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Batch" name="batch_id" required>
          <Select id="batch_id" name="batch_id" defaultValue={a?.batch_id ?? ""} disabled={!!a}>
            <option value="" disabled>Select a batch</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
          </Select>
          {a && <input type="hidden" name="batch_id" value={a.batch_id} />}
        </FormField>
        <FormField label="Module" name="module_id">
          <Select id="module_id" name="module_id" defaultValue={a?.module_id ?? ""}>
            <option value="">No module</option>
            {modules.map((m) => <option key={m.id} value={m.id}>{batches.find((b) => b.course_id === m.course_id)?.code.split("-")[0]} · {m.position}. {m.title}</option>)}
          </Select>
        </FormField>
      </div>
      <FormField label="Title" name="title" required><Input id="title" name="title" defaultValue={a?.title} /></FormField>
      <FormField label="Description" name="description"><Textarea id="description" name="description" defaultValue={a?.description ?? ""} className="min-h-16" /></FormField>
      <FormField label="Instructions" name="instructions"><Textarea id="instructions" name="instructions" defaultValue={a?.instructions ?? ""} /></FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Assigned on" name="assigned_on" required><Input id="assigned_on" name="assigned_on" type="date" defaultValue={a?.assigned_on ?? todayInAcademy()} /></FormField>
        <FormField label="Deadline (IST)" name="deadline" required><Input id="deadline" name="deadline" type="datetime-local" defaultValue={a ? isoToAcademyInput(a.deadline) : ""} /></FormField>
        <FormField label="Maximum marks" name="max_marks" required><Input id="max_marks" name="max_marks" type="number" min={1} defaultValue={a?.max_marks ?? 100} /></FormField>
        <FormField label="Late submissions" name="late_policy">
          <Select id="late_policy" name="late_policy" defaultValue={a?.late_policy ?? "grace"}>
            <option value="grace">Accept within the grace period</option><option value="always">Always accept (marked late)</option><option value="none">Do not accept</option>
          </Select>
        </FormField>
        <FormField label="Status" name="status">
          <Select id="status" name="status" defaultValue={a?.status ?? "published"}><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></Select>
        </FormField>
        <label className="mt-7 flex items-center gap-2 text-sm"><input type="checkbox" name="is_required" defaultChecked={a?.is_required ?? true} className="size-4 accent-brand-700" /> Required for certificate</label>
      </div>
      <FormField label="Allowed submission types" name="submission_types" required>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(([v, l]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50">
              <input type="checkbox" name="submission_types[]" value={v} defaultChecked={a ? a.submission_types.includes(v) : v !== "project_link"} className="accent-brand-700" /> {l}
            </label>
          ))}
        </div>
      </FormField>
      <FormField label="Attachment (optional)" name="attachment" hint="Brief, starter files etc. Up to 10 MB."><Input id="attachment" name="attachment" type="file" className="py-1.5" /></FormField>
      <div className="flex justify-end"><SubmitButton>{a ? "Save assignment" : "Create assignment"}</SubmitButton></div>
    </ActionForm>
  );
}
