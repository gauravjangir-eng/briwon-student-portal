import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { InfoNote } from "@/components/ui/misc";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  return (
    <AuthShell title="Welcome back" subtitle="Sign in with the email registered at Briwon Academy.">
      {!isSupabaseConfigured && (
        <div className="mb-6"><InfoNote tone="amber">Supabase is not configured yet. Add the keys from <code>.env.example</code> to <code>.env.local</code>.</InfoNote></div>
      )}
      {sp.error === "link" && <div className="mb-6"><InfoNote tone="amber">That link is invalid or has expired. Ask the academy to resend your invitation, or reset your password.</InfoNote></div>}
      <LoginForm next={sp.next} />
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/forgot-password" className="font-medium text-brand-600 hover:underline">Forgot your password?</Link>
      </p>
      <p className="mt-8 text-center text-xs text-muted">Accounts are created by the academy. New students receive an email invitation to set their password.</p>
    </AuthShell>
  );
}
