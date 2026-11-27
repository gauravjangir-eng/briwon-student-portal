import { ActionForm, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select } from "@/components/ui/input";
import { saveSession } from "@/lib/actions/academics";
import { todayInAcademy, isoToAcademyInput } from "@/lib/utils";

type S = { id: string; batch_id: string; title: string; starts_at: string; ends_at: string; location: string | null };

export function SessionForm({ batches, s, defaultBatch }: { batches: { id: string; code: string }[]; s?: S; defaultBatch?: string }) {
  const start = s ? isoToAcademyInput(s.starts_at) : "";
  const end = s ? isoToAcademyInput(s.ends_at) : "";
  return (
    <ActionForm action={saveSession} resetOnSuccess={!s}>
      {s && <input type="hidden" name="id" value={s.id} />}
      <FormField label="Batch" name="batch_id" required>
        <Select id="batch_id" name="batch_id" defaultValue={s?.batch_id ?? defaultBatch ?? ""} disabled={!!s}>
          <option value="" disabled>Select a batch</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
        </Select>
        {s && <input type="hidden" name="batch_id" value={s.batch_id} />}
      </FormField>
      <FormField label="Title" name="title" required><Input id="title" name="title" defaultValue={s?.title ?? "Class"} /></FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Date" name="date" required><Input id="date" name="date" type="date" defaultValue={start ? start.slice(0, 10) : todayInAcademy()} /></FormField>
        <FormField label="Starts" name="start_time" required><Input id="start_time" name="start_time" type="time" defaultValue={start ? start.slice(11, 16) : "10:00"} /></FormField>
        <FormField label="Ends" name="end_time" required><Input id="end_time" name="end_time" type="time" defaultValue={end ? end.slice(11, 16) : "12:00"} /></FormField>
      </div>
      <FormField label="Location" name="location"><Input id="location" name="location" defaultValue={s?.location ?? ""} /></FormField>
      <p className="text-xs text-muted">Times are in academy time (IST).</p>
      <div className="flex justify-end"><SubmitButton>{s ? "Save changes" : "Schedule session"}</SubmitButton></div>
    </ActionForm>
  );
}
