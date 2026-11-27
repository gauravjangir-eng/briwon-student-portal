import { CalendarDays, MapPin } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { currentEnrollment, settings } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, InfoNote, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/utils";
import { CheckInButton } from "./check-in";

export const metadata = { title: "Timetable & check-in" };

export default async function TimetablePage() {
  const user = await requireStudent();
  const supabase = await createClient();
  const [en, st] = await Promise.all([currentEnrollment(supabase, user.studentId), settings(supabase)]);
  if (!en) return <><PageHeader title="Timetable" /><Card><EmptyState title="No active enrollment" /></Card></>;
  const from = new Date(Date.now() - 86400000).toISOString();
  const to = new Date(Date.now() + 21 * 86400000).toISOString();
  const [{ data: sessions }, { data: mine }] = await Promise.all([
    supabase.from("class_sessions").select("id, title, starts_at, ends_at, location, status, modules(title)").eq("batch_id", en.batch_id).gte("starts_at", from).lte("starts_at", to).order("starts_at"),
    supabase.from("attendance").select("session_id, status, check_in_at").eq("student_id", user.studentId),
  ]);
  const marked = new Map((mine ?? []).map((a) => [a.session_id, a]));
  const now = Date.now();
  const openBefore = st.checkin_opens_before_min * 60000;
  const isOpen = (s: { starts_at: string; ends_at: string; status: string }) =>
    s.status === "scheduled" && now >= new Date(s.starts_at).getTime() - openBefore && now <= new Date(s.ends_at).getTime();

  const byDay = new Map<string, NonNullable<typeof sessions>>();
  for (const s of sessions ?? []) {
    const k = formatDate(s.starts_at, { weekday: "long", day: "2-digit", month: "short", year: undefined });
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }

  return (
    <>
      <PageHeader title="Timetable & check-in" description={`${en.courses?.name} · ${en.batches?.code}`} />
      <div className="mb-6">
        <InfoNote>
          <MapPin className="mr-1 inline size-4" /> Check in from {st.checkin_opens_before_min} min before class. Up to {st.present_until_min} min after the start counts as <b>Present</b>, up to {st.late_until_min} min as <b>Late</b>, later is <b>Absent</b>.
          Your location is read once when you tap “Check in” and is checked against the academy location ({st.campus_radius_m} m radius). We never track you continuously.
        </InfoNote>
      </div>
      {!sessions?.length ? <Card><EmptyState icon={CalendarDays} title="No classes in the next three weeks" /></Card> : (
        <div className="space-y-6">
          {[...byDay.entries()].map(([day, list]) => (
            <Card key={day}>
              <CardHeader title={day} />
              <CardBody className="space-y-3">
                {list.map((s) => {
                  const a = marked.get(s.id);
                  return (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
                      <div>
                        <p className="font-semibold">{s.title}{s.modules?.title && <span className="font-normal text-muted"> · {s.modules.title}</span>}</p>
                        <p className="text-sm text-muted">{formatTime(s.starts_at)} – {formatTime(s.ends_at)}{s.location && ` · ${s.location}`}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.status === "cancelled" ? <StatusBadge status="cancelled" />
                          : a ? <><StatusBadge status={a.status} />{a.check_in_at && <span className="text-xs text-muted">at {formatTime(a.check_in_at)}</span>}</>
                          : isOpen(s) ? <CheckInButton sessionId={s.id} />
                          : new Date(s.ends_at).getTime() < now ? <span className="text-xs text-muted">Not marked</span>
                          : <span className="text-xs text-muted">Check-in opens {formatTime(new Date(new Date(s.starts_at).getTime() - openBefore))}</span>}
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
