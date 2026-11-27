import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, GraduationCap, Mail, MessageCircle, MessageSquare, Pencil, Phone, RefreshCw, Footprints } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { courseOptions } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DescriptionList, EmptyState, InfoNote, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, Dialog, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select, Textarea } from "@/components/ui/input";
import { addLeadActivity, updateLeadStatus } from "@/lib/actions/leads";
import { LEAD_ACTIVITY_KINDS, LEAD_OPEN_STATUSES } from "@/lib/validation";
import { formatDate, formatDateTime, humanize } from "@/lib/utils";
import { LeadForm } from "../lead-form";

export const metadata = { title: "Enquiry" };

const KIND_ICONS = { note: MessageSquare, call: Phone, email: Mail, whatsapp: MessageCircle, visit: Footprints, status: RefreshCw } as const;

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: lead }, { data: activities }, courses] = await Promise.all([
    supabase.from("leads").select("*, courses(name), students(id, student_code)").eq("id", id).maybeSingle(),
    supabase.from("lead_activities").select("id, kind, body, created_at, profiles(full_name)").eq("lead_id", id).order("created_at", { ascending: false }),
    courseOptions(supabase),
  ]);
  if (!lead) notFound();
  const closed = lead.status === "converted" || lead.status === "lost";

  return (
    <>
      <PageHeader back={{ href: "/admin/leads", label: "Enquiries" }} title={lead.full_name}
        description={<span className="flex flex-wrap items-center gap-2">{lead.phone}{lead.email && ` · ${lead.email}`} <StatusBadge status={lead.status} /></span>}
        actions={<>
          <Dialog wide title="Edit enquiry" trigger={<Button variant="outline"><Pencil /> Edit</Button>}><LeadForm lead={lead} courses={courses} /></Dialog>
          {lead.status !== "converted" && <Button asChild><Link href={`/admin/students/new?lead=${lead.id}`}><GraduationCap /> Admit as student</Link></Button>}
        </>} />

      {lead.status === "converted" && lead.students && (
        <div className="mb-6"><InfoNote>Admitted on {formatDate(lead.converted_at)} as <Link className="font-mono font-semibold underline" href={`/students/${lead.students.id}`}>{lead.students.student_code}</Link>.</InfoNote></div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <DescriptionList cols={1} items={[
                ["Interested in", lead.courses?.name ?? "Not decided"],
                ["Source", humanize(lead.source)],
                ["City", lead.city ?? "—"],
                ["Next follow-up", closed ? "—" : formatDate(lead.next_follow_up) || "Not set"],
                ...(lead.status === "lost" ? [["Reason lost", lead.lost_reason ?? "—"] as [string, React.ReactNode]] : []),
                ["Added", formatDateTime(lead.created_at)],
                ["Notes", lead.notes ? <span className="whitespace-pre-line">{lead.notes}</span> : "—"],
              ]} />
            </CardBody>
          </Card>

          {lead.status !== "converted" && (
            <Card>
              <CardHeader title="Update status" description="Use “Admit as student” to convert." />
              <CardBody>
                <ActionForm action={updateLeadStatus}>
                  <input type="hidden" name="id" value={lead.id} />
                  <FormField label="Status" name="status">
                    <Select id="status" name="status" defaultValue={lead.status}>
                      {[...LEAD_OPEN_STATUSES, "lost" as const].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Next follow-up" name="next_follow_up"><Input id="next_follow_up" name="next_follow_up" type="date" defaultValue={lead.next_follow_up ?? ""} /></FormField>
                  <FormField label="Reason (if lost)" name="lost_reason"><Input id="lost_reason" name="lost_reason" defaultValue={lead.lost_reason ?? ""} /></FormField>
                  <div className="flex justify-end"><SubmitButton>Update</SubmitButton></div>
                </ActionForm>
              </CardBody>
            </Card>
          )}
        </div>

        <Card className="lg:col-span-2">
          <CardHeader title="Activity" description="Calls, messages, visits and notes. Entries cannot be edited or deleted." />
          <CardBody className="space-y-6">
            <ActionForm action={addLeadActivity} resetOnSuccess>
              <input type="hidden" name="lead_id" value={lead.id} />
              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <FormField label="Type" name="kind">
                  <Select id="kind" name="kind" defaultValue="call">{LEAD_ACTIVITY_KINDS.map((k) => <option key={k} value={k}>{k === "whatsapp" ? "WhatsApp" : humanize(k)}</option>)}</Select>
                </FormField>
                <FormField label="What happened" name="body" required><Textarea id="body" name="body" className="min-h-20" placeholder="e.g. Called, wants the weekend batch. Call back Monday." /></FormField>
              </div>
              <div className="flex justify-end"><SubmitButton>Add activity</SubmitButton></div>
            </ActionForm>
            {!activities?.length ? <EmptyState icon={CalendarClock} title="No activity yet" description="Log your first call or message above." /> : (
              <ol className="space-y-3">
                {activities.map((a) => {
                  const Icon = KIND_ICONS[a.kind as keyof typeof KIND_ICONS] ?? MessageSquare;
                  return (
                    <li key={a.id} className="flex gap-3 rounded-xl border border-line p-3">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon className="size-4" /></span>
                      <div className="min-w-0">
                        <p className="whitespace-pre-line text-sm">{a.body}</p>
                        <p className="mt-1 text-xs text-muted">{a.kind === "whatsapp" ? "WhatsApp" : humanize(a.kind)} · {formatDateTime(a.created_at)}{a.profiles?.full_name && ` · ${a.profiles.full_name}`}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
