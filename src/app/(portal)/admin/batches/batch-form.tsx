import { ActionForm, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select } from "@/components/ui/input";
import { saveBatch } from "@/lib/actions/catalog";

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type B = { id: string; course_id: string; code: string; name: string; start_date: string; end_date: string; schedule_days: number[]; class_start_time: string; class_end_time: string; capacity: number; location: string | null; status: string };

export function BatchForm({ b, courses }: { b?: B; courses: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveBatch} resetOnSuccess={!b}>
      {b && <input type="hidden" name="id" value={b.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Course" name="course_id" required>
          <Select id="course_id" name="course_id" defaultValue={b?.course_id ?? ""} disabled={!!b}>
            <option value="" disabled>Select a course</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          {b && <input type="hidden" name="course_id" value={b.course_id} />}
        </FormField>
        <FormField label="Batch code" name="code" required hint="e.g. FSWD-2026-B"><Input id="code" name="code" defaultValue={b?.code} className="uppercase" /></FormField>
        <FormField label="Name" name="name" required><Input id="name" name="name" defaultValue={b?.name} placeholder="Full Stack — Evening" /></FormField>
        <FormField label="Location" name="location"><Input id="location" name="location" defaultValue={b?.location ?? ""} /></FormField>
        <FormField label="Start date" name="start_date" required><Input id="start_date" name="start_date" type="date" defaultValue={b?.start_date} /></FormField>
        <FormField label="End date" name="end_date" required><Input id="end_date" name="end_date" type="date" defaultValue={b?.end_date} /></FormField>
        <FormField label="Class starts" name="class_start_time" required><Input id="class_start_time" name="class_start_time" type="time" defaultValue={b?.class_start_time?.slice(0, 5) ?? "10:00"} /></FormField>
        <FormField label="Class ends" name="class_end_time" required><Input id="class_end_time" name="class_end_time" type="time" defaultValue={b?.class_end_time?.slice(0, 5) ?? "12:00"} /></FormField>
        <FormField label="Capacity" name="capacity" required><Input id="capacity" name="capacity" type="number" min={1} defaultValue={b?.capacity ?? 30} /></FormField>
        <FormField label="Status" name="status">
          <Select id="status" name="status" defaultValue={b?.status ?? "planned"}>{["planned", "active", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</option>)}</Select>
        </FormField>
      </div>
      <FormField label="Class days" name="schedule_days" required>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d, i) => (
            <label key={d} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50">
              <input type="checkbox" name="schedule_days[]" value={i} defaultChecked={b ? b.schedule_days.includes(i) : [1, 3, 5].includes(i)} className="accent-brand-700" /> {d}
            </label>
          ))}
        </div>
      </FormField>
      <div className="flex justify-end"><SubmitButton>{b ? "Save batch" : "Create batch"}</SubmitButton></div>
    </ActionForm>
  );
}
