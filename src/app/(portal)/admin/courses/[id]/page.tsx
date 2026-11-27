import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DescriptionList, EmptyState, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, ConfirmAction, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Textarea } from "@/components/ui/input";
import { deleteModule, moveModule, saveModule } from "@/lib/actions/catalog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CourseForm } from "../course-form";
import Link from "next/link";

export const metadata = { title: "Course" };

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: c }, { data: modules }, { data: batches }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle(),
    supabase.from("modules").select("*").eq("course_id", id).order("position"),
    supabase.from("batches").select("id, code, name, start_date, status").eq("course_id", id).order("start_date", { ascending: false }),
  ]);
  if (!c) notFound();
  const nextPos = (modules?.at(-1)?.position ?? 0) + 1;

  return (
    <>
      <PageHeader back={{ href: "/admin/courses", label: "Courses" }} title={c.name} description={<><span className="font-mono">{c.code}</span> · {c.duration_weeks} weeks · {formatCurrency(c.fee_amount)}</>}
        actions={<Dialog wide title="Edit course" trigger={<Button variant="outline"><Pencil /> Edit course</Button>}><CourseForm c={c} /></Dialog>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Modules" description="Taught in this order"
            action={
              <Dialog title="Add module" trigger={<Button size="sm"><Plus /> Add module</Button>}>
                <ActionForm action={saveModule} resetOnSuccess>
                  <input type="hidden" name="course_id" value={c.id} />
                  <FormField label="Title" name="title" required><Input id="title" name="title" /></FormField>
                  <FormField label="Position" name="position" required><Input id="position" name="position" type="number" min={1} defaultValue={nextPos} /></FormField>
                  <FormField label="Description" name="description"><Textarea id="description" name="description" /></FormField>
                  <div className="flex justify-end"><SubmitButton>Add module</SubmitButton></div>
                </ActionForm>
              </Dialog>
            } />
          {!modules?.length ? <EmptyState title="No modules yet" description="Add modules to structure the course." /> : (
            <ol className="divide-y divide-line">
              {modules.map((m, i) => (
                <li key={m.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">{m.position}</span>
                  <div className="min-w-0 flex-1"><p className="font-medium">{m.title}</p>{m.description && <p className="truncate text-xs text-muted">{m.description}</p>}</div>
                  <div className="flex items-center gap-1">
                    <ActionForm action={moveModule} successToast={false}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="course_id" value={c.id} /><input type="hidden" name="dir" value="up" /><SubmitButton size="icon" variant="ghost" disabled={i === 0} aria-label="Move up" pendingText=""><ArrowUp /></SubmitButton></ActionForm>
                    <ActionForm action={moveModule} successToast={false}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="course_id" value={c.id} /><input type="hidden" name="dir" value="down" /><SubmitButton size="icon" variant="ghost" disabled={i === modules.length - 1} aria-label="Move down" pendingText=""><ArrowDown /></SubmitButton></ActionForm>
                    <Dialog title="Edit module" trigger={<Button size="icon" variant="ghost" aria-label="Edit module"><Pencil /></Button>}>
                      <ActionForm action={saveModule}>
                        <input type="hidden" name="id" value={m.id} /><input type="hidden" name="course_id" value={c.id} /><input type="hidden" name="position" value={m.position} />
                        <FormField label="Title" name="title" required><Input id="title" name="title" defaultValue={m.title} /></FormField>
                        <FormField label="Description" name="description"><Textarea id="description" name="description" defaultValue={m.description ?? ""} /></FormField>
                        <div className="flex justify-end"><SubmitButton>Save</SubmitButton></div>
                      </ActionForm>
                    </Dialog>
                    <ConfirmAction action={deleteModule} fields={{ id: m.id, course_id: c.id }} label={<Trash2 className="size-4" />} variant="ghost" size="icon"
                      title={`Remove "${m.title}"?`} description="Assignments linked to this module keep their data but lose the module tag." confirmVariant="danger" confirmLabel="Remove" />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <div className="space-y-6">
          <Card><CardHeader title="About" /><CardBody><DescriptionList cols={1} items={[["Description", c.description], ["Requirements", c.requirements], ["Status", <StatusBadge key="s" status={c.status} />]]} /></CardBody></Card>
          <Card>
            <CardHeader title="Batches" />
            <CardBody className="space-y-2">
              {!batches?.length && <p className="text-sm text-muted">No batches yet.</p>}
              {batches?.map((b) => (
                <Link key={b.id} href={`/admin/batches/${b.id}`} className="flex items-center justify-between rounded-xl border border-line p-3 text-sm hover:bg-brand-50/50">
                  <span><span className="font-medium">{b.code}</span><span className="block text-xs text-muted">Starts {formatDate(b.start_date)}</span></span><StatusBadge status={b.status} />
                </Link>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
