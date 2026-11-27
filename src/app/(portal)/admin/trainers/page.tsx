import { Mail, Pencil, UserPlus, UserSquare2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select } from "@/components/ui/input";
import { inviteTrainer, saveTrainer } from "@/lib/actions/admin";

export const metadata = { title: "Trainers" };

type T = { id?: string; full_name?: string; email?: string; phone?: string | null; specialization?: string | null; status?: string };

function TrainerForm({ t }: { t?: T }) {
  return (
    <ActionForm action={saveTrainer} resetOnSuccess={!t}>
      {t?.id && <input type="hidden" name="id" value={t.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name" name="full_name" required><Input id="full_name" name="full_name" defaultValue={t?.full_name} /></FormField>
        <FormField label="Email" name="email" required><Input id="email" name="email" type="email" defaultValue={t?.email} /></FormField>
        <FormField label="Phone" name="phone"><Input id="phone" name="phone" defaultValue={t?.phone ?? ""} /></FormField>
        <FormField label="Specialization" name="specialization"><Input id="specialization" name="specialization" defaultValue={t?.specialization ?? ""} /></FormField>
        <FormField label="Status" name="status"><Select id="status" name="status" defaultValue={t?.status ?? "active"}><option value="active">Active</option><option value="inactive">Inactive</option></Select></FormField>
      </div>
      <div className="flex justify-end"><SubmitButton>{t ? "Save" : "Add trainer"}</SubmitButton></div>
    </ActionForm>
  );
}

export default async function TrainersPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const [{ data: trainers }, { data: links }, { data: enrollments }, { data: pending }] = await Promise.all([
    supabase.from("trainers").select("*").order("full_name"),
    supabase.from("batch_trainers").select("trainer_id, batch_id, batches(code, status)"),
    supabase.from("enrollments").select("batch_id").eq("status", "active"),
    supabase.from("submissions").select("assignments!inner(batch_id)").in("status", ["submitted", "late", "under_review"]),
  ]);
  const studentsPerBatch = (enrollments ?? []).reduce<Record<string, number>>((m, e) => ((m[e.batch_id] = (m[e.batch_id] ?? 0) + 1), m), {});
  const pendingPerBatch = (pending ?? []).reduce<Record<string, number>>((m, p) => ((m[p.assignments.batch_id] = (m[p.assignments.batch_id] ?? 0) + 1), m), {});

  return (
    <>
      <PageHeader title="Trainers & mentors" description="Manage trainer records, invitations and see each trainer's workload."
        actions={<Dialog wide title="Add trainer" trigger={<Button><UserPlus /> Add trainer</Button>}><TrainerForm /></Dialog>} />
      <Card>
        {!trainers?.length ? <EmptyState icon={UserSquare2} title="No trainers yet" description="Add a trainer, then assign them to batches." /> : (
          <Table>
            <THead><TR><TH>Trainer</TH><TH>Code</TH><TH>Batches</TH><TH>Students</TH><TH>Pending reviews</TH><TH>Status</TH><TH className="text-right">Actions</TH></TR></THead>
            <TBody>
              {trainers.map((t) => {
                const mine = (links ?? []).filter((l) => l.trainer_id === t.id);
                const active = mine.filter((l) => l.batches?.status === "active" || l.batches?.status === "planned");
                const students = active.reduce((s, l) => s + (studentsPerBatch[l.batch_id] ?? 0), 0);
                const pend = active.reduce((s, l) => s + (pendingPerBatch[l.batch_id] ?? 0), 0);
                return (
                  <TR key={t.id}>
                    <TD><p className="font-semibold">{t.full_name}</p><p className="text-xs text-muted">{t.email}{t.specialization && ` · ${t.specialization}`}</p></TD>
                    <TD className="font-mono text-xs">{t.trainer_code}</TD>
                    <TD className="text-xs">{active.map((l) => l.batches?.code).join(", ") || "—"}</TD>
                    <TD>{students}</TD>
                    <TD>{pend ? <span className="font-semibold text-amber-700">{pend}</span> : 0}</TD>
                    <TD><StatusBadge status={t.status} />{!t.profile_id && <span className="mt-1 block text-xs text-muted">No account</span>}</TD>
                    <TD>
                      <div className="flex justify-end gap-2">
                        {!t.profile_id && <ActionForm action={inviteTrainer}><input type="hidden" name="id" value={t.id} /><SubmitButton size="sm" variant="outline" pendingText="Sending…"><Mail /> Invite</SubmitButton></ActionForm>}
                        <Dialog wide title="Edit trainer" trigger={<Button size="sm" variant="ghost" aria-label={`Edit ${t.full_name}`}><Pencil /></Button>}><TrainerForm t={t} /></Dialog>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
