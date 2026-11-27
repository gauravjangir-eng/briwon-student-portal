"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { announcementSchema, passwordSchema } from "@/lib/validation";
import { dbError, fail, ok, parseForm, type ActionResult } from "./result";

type Prev = ActionResult | null;

export async function createAnnouncement(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await requireRole("admin", "trainer");
  const parsed = parseForm(announcementSchema, formData);
  if (parsed.error) return parsed.error;
  const v = parsed.data;
  if (user.role === "trainer" && v.audience !== "batch") return fail("Trainers can post announcements to their own batches only.", { audience: ["Choose a batch"] });
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    title: v.title, body: v.body, audience: v.audience, batch_id: v.audience === "batch" ? v.batch_id! : null, is_pinned: v.is_pinned,
    expires_at: v.expires_at ? new Date(`${v.expires_at}T23:59:59+05:30`).toISOString() : null, created_by: user.id,
  });
  if (error) return dbError(error);
  revalidatePath("/announcements");
  return ok("Announcement published and notifications sent.");
}

export async function deleteAnnouncement(_: Prev, formData: FormData): Promise<ActionResult> {
  await requireRole("admin", "trainer");
  const parsed = parseForm(z.object({ id: z.guid() }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", parsed.data.id);
  if (error) return dbError(error);
  revalidatePath("/announcements");
  return ok("Announcement removed.");
}

export async function markAllRead(): Promise<ActionResult> {
  await requireRole();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notifications_read", {});
  if (error) return dbError(error);
  revalidatePath("/notifications");
  return ok("All notifications marked as read.");
}

export async function changePassword(_: Prev, formData: FormData): Promise<ActionResult> {
  const user = await requireRole();
  const parsed = parseForm(passwordSchema.and(z.object({ current: z.string().min(1, "Enter your current password") })), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  // Re-verify the current password before changing it
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.current });
  if (authErr) return fail("Your current password is incorrect.", { current: ["Incorrect password"] });
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail("Could not change your password. Choose a different password and try again.");
  return ok("Password changed.");
}
