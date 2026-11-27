import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ActionForm, SubmitButton } from "@/components/ui/client";
import { markAllRead } from "@/lib/actions/common";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireRole();
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  return (
    <>
      <PageHeader title="Notifications" description={`${unread} unread`}
        actions={!!unread && <ActionForm action={async () => { "use server"; return markAllRead(); }}><SubmitButton variant="outline"><CheckCheck /> Mark all as read</SubmitButton></ActionForm>} />
      <Card>
        {!data?.length ? <EmptyState icon={Bell} title="You're all caught up" description="Updates about classes, assignments, results and more will appear here." /> : (
          <ul className="divide-y divide-line">
            {data.map((n) => {
              const body = (
                <div className={cn("flex gap-3 px-5 py-4", !n.read_at && "bg-brand-50/50")}>
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-brand-400")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", !n.read_at && "font-semibold")}>{n.title}</p>
                    {n.body && <p className="text-sm text-muted">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted">{formatDateTime(n.created_at)}</p>
                  </div>
                </div>
              );
              return <li key={n.id}>{n.link ? <Link href={n.link} className="block hover:bg-brand-50/60">{body}</Link> : body}</li>;
            })}
          </ul>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">Email notifications are not enabled yet. All alerts are shown here in the portal.</p>
    </>
  );
}
