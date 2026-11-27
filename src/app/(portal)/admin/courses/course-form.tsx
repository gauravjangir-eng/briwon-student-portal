import { ActionForm, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select, Textarea } from "@/components/ui/input";
import { saveCourse } from "@/lib/actions/catalog";

type C = { id: string; code: string; name: string; description: string | null; requirements: string | null; duration_weeks: number; fee_amount: number; status: string };

export function CourseForm({ c }: { c?: C }) {
  return (
    <ActionForm action={saveCourse} resetOnSuccess={!c}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Course code" name="code" required hint="e.g. FSWD"><Input id="code" name="code" defaultValue={c?.code} className="uppercase" /></FormField>
        <FormField label="Course name" name="name" required><Input id="name" name="name" defaultValue={c?.name} /></FormField>
        <FormField label="Duration (weeks)" name="duration_weeks" required><Input id="duration_weeks" name="duration_weeks" type="number" min={1} defaultValue={c?.duration_weeks ?? 12} /></FormField>
        <FormField label="Standard fee (₹)" name="fee_amount" required><Input id="fee_amount" name="fee_amount" type="number" min={0} defaultValue={c?.fee_amount ?? 0} /></FormField>
        <FormField label="Status" name="status"><Select id="status" name="status" defaultValue={c?.status ?? "active"}><option value="active">Active</option><option value="archived">Archived</option></Select></FormField>
      </div>
      <FormField label="Description" name="description"><Textarea id="description" name="description" defaultValue={c?.description ?? ""} /></FormField>
      <FormField label="Requirements" name="requirements"><Textarea id="requirements" name="requirements" defaultValue={c?.requirements ?? ""} className="min-h-16" /></FormField>
      <div className="flex justify-end"><SubmitButton>{c ? "Save course" : "Create course"}</SubmitButton></div>
    </ActionForm>
  );
}
