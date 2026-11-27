"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { checkIn } from "@/lib/actions/student";

/** Reads the device location ONCE, only when the student taps the button. No background tracking. */
export function CheckInButton({ sessionId }: { sessionId: string }) {
  const [pending, start] = useTransition();
  const [locating, setLocating] = useState(false);
  const router = useRouter();

  const onClick = () => {
    if (!("geolocation" in navigator)) return toast.error("Your browser does not support location. Ask your trainer to mark you.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        start(async () => {
          const r = await checkIn(sessionId, { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
          if (r.ok) toast.success(r.message); else toast.error(r.message);
          router.refresh();
        });
      },
      (err) => {
        setLocating(false);
        toast.error(err.code === err.PERMISSION_DENIED ? "Location permission was denied. Allow location for this site to check in." : "Could not get your location. Move to an open area and try again.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const busy = pending || locating;
  return (
    <Button variant="accent" onClick={onClick} disabled={busy} aria-busy={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <MapPin />} {locating ? "Getting location…" : pending ? "Checking in…" : "Check in now"}
    </Button>
  );
}
