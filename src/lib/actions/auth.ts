"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env, isSupabaseConfigured } from "@/lib/env";
import { homeFor, getCurrentUser, type Role } from "@/lib/auth";
import { fail, ok, parseForm, type ActionResult } from "./result";
import { passwordSchema } from "@/lib/validation";

const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export async function signIn(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("The portal is not connected to Supabase yet. See PROJECT_NOTES.md.");
  const parsed = parseForm(signInSchema, formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email.toLowerCase(), password: parsed.data.password });
  if (error || !data.user) {
    return fail(error?.status === 429 ? "Too many attempts. Please wait a few minutes and try again." : "Incorrect email or password.");
  }
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", data.user.id).maybeSingle();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return fail("Your account is inactive. Please contact the academy office.");
  }
  const next = parsed.data.next;
  redirect(next && /^\/(?![/\\])/.test(next) ? next : homeFor(profile.role as Role));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(z.object({ email: z.email("Enter a valid email address") }), formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email.toLowerCase(), {
    redirectTo: `${env.siteUrl}/auth/confirm?next=/set-password`,
  });
  // Same response whether or not the account exists (prevents account discovery)
  return ok("If an account exists for that email, a reset link is on its way.");
}

export async function setPassword(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Your link has expired. Please request a new one.");
  const parsed = parseForm(passwordSchema, formData);
  if (parsed.error) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(error.message.includes("different") ? "Choose a password different from your current one." : "Could not update your password. Please try again.");
  return ok("Password saved.", { redirect: homeFor(user.role) });
}
