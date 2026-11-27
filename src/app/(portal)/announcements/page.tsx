import { Megaphone, Pin, Plus, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions } from "@/lib/queries";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, ConfirmAction, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select, Textarea } from "@/components/ui/input";
import { createAnnouncement, deleteAnnouncement } from "@/lib/actions/common";
import { formatDateTime, humanize } from "@/lib/utils";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const user = await requireRole();
  const supabase = await createClient();
  const staff = user.role !== "student";
  const [{ data }, batches] = await Promise.all([
    supabase.from("announcements").select("*, batches(code)").order("is_pinned", { ascending: false }).order("published_at", { ascending: false }).limit(50),
    staff ? batchOptions(supabase, user) : Promise.resolve([]),
  ]);
  return (
    <>
      <PageHeader title="Announcements" description="News and updates from Briwon Academy."
        actions={staff && (
          <Dialog wide title="New announcement" description="Everyone in the audience receives an in-app notification." trigger={<Button><Plus /> New announcement</Button>}>
            <ActionForm action={createAnnouncement} resetOnSuccess>
              <FormField label="Title" name="title" required><Input id="title" name="title" /></FormField>
              <FormField label="Message" name="body" required><Textarea id="body" name="body" className="min-h-32" /></FormField>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Audience" name="audience">
                  <Select id="audience" name="audience" defaultValue={user.role === "admin" ? "all" : "batch"}>
                    {user.role === "admin" && <><option value="all">Everyone</option><option value="students">All students</option><option value="trainers">All trainers</option></>}
                    <option value="batch">One batch</option>
                  </Select>
                </FormField>
                <FormField label="Batch" name="batch_id" hint="For batch announcements"><Select id="batch_id" name="batch_id" defaultValue=""><option value="">—</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}</Select></FormField>
                <FormField label="Expires" name="expires_at"><Input id="expires_at" name="expires_at" type="date" /></FormField>
              </div>
              {user.role === "admin" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_pinned" className="size-4 accent-brand-700" /> Pin to top</label>}
              <div className="flex justify-end"><SubmitButton>Publish</SubmitButton></div>
            </ActionForm>
          </Dialog>
        )} />
      {!data?.length ? <Card><EmptyState icon={Megaphone} title="No announcements" /></Card> : (
        <div className="space-y-4">
          {data.map((a) => (
            <Card key={a.id}>
              <CardBody>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-lg font-bold">{a.is_pinned && <Pin className="size-4 text-brand-400" aria-label="Pinned" />}{a.title}</h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">{formatDateTime(a.published_at)} <Badge tone="blue">{a.audience === "batch" ? a.batches?.code : humanize(a.audience)}</Badge></p>
                  </div>
                  {(user.role === "admin" || a.created_by === user.id) && <ConfirmAction action={deleteAnnouncement} fields={{ id: a.id }} label={<Trash2 className="size-4" />} size="icon" variant="ghost" title="Delete this announcement?" confirmVariant="danger" confirmLabel="Delete" />}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{a.body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
