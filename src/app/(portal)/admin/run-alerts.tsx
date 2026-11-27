"use client";
import { useTransition } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runDailyAlerts } from "@/lib/actions/admin";

export function RunAlertsButton() {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" disabled={pending} onClick={() => start(async () => {
      const r = await runDailyAlerts();
      if (r.ok) toast.success(r.message); else toast.error(r.message);
    })}>
      {pending ? <Loader2 className="animate-spin" /> : <BellRing />} Send alerts & reminders
    </Button>
  );
}
