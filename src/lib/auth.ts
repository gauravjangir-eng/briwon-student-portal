import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type Role = "admin" | "trainer" | "student";

export type CurrentUser = {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  studentId: string | null;
  trainerId: string | null;
};

/** Reads the signed-in user (validated with Supabase Auth) and their profile. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !profile.is_active) return null;

  let studentId: string | null = null;
  let trainerId: string | null = null;
  if (profile.role === "student") {
    const { data } = await supabase.from("students").select("id").eq("profile_id", user.id).maybeSingle();
    studentId = data?.id ?? null;
  } else if (profile.role === "trainer") {
    const { data } = await supabase.from("trainers").select("id").eq("profile_id", user.id).maybeSingle();
    trainerId = data?.id ?? null;
  }

  return {
    id: user.id,
    email: profile.email,
    role: profile.role as Role,
    fullName: profile.full_name || profile.email,
    studentId,
    trainerId,
  };
});

export const homeFor = (role: Role) => (role === "admin" ? "/admin" : role === "trainer" ? "/trainer" : "/student");

/** Server-side guard for pages and actions. Redirects when not allowed. */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles.length && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export async function requireStudent() {
  const user = await requireRole("student");
  if (!user.studentId) redirect("/account?missing=student");
  return user as CurrentUser & { studentId: string };
}
