import Link from "next/link";
import { createClient as createPublic } from "@supabase/supabase-js";
import { BadgeCheck, ShieldX } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand";
import { env, isSupabaseConfigured } from "@/lib/env";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Certificate verification" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  type Cert = { certificate_number: string; student_name: string; course_name: string; completion_date: string; grade: string; status: string };
  let cert: Cert | null = null;
  if (isSupabaseConfigured && UUID.test(token)) {
    // Anonymous client: can only call verify_certificate(), which returns approved, non-sensitive fields.
    const supabase = createPublic(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false } });
    const { data } = await supabase.rpc("verify_certificate", { p_token: token });
    cert = ((data as Cert[] | null) ?? [])[0] ?? null;
  }
  const valid = cert?.status === "approved";
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div className="brand-gradient px-8 py-6"><BrandLogo light /></div>
        <div className="p-8">
          {cert ? (
            <>
              <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${valid ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                {valid ? <BadgeCheck className="size-6" /> : <ShieldX className="size-6" />}
                <p className="font-semibold">{valid ? "This certificate is authentic and valid." : "This certificate has been revoked."}</p>
              </div>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {[["Awarded to", cert.student_name], ["Course", cert.course_name], ["Certificate no.", cert.certificate_number],
                  ["Completion date", formatDate(cert.completion_date)], ["Grade", cert.grade]].map(([k, v]) => (
                  <div key={k}><dt className="text-xs font-medium uppercase tracking-wide text-muted">{k}</dt><dd className="mt-1 font-semibold">{v}</dd></div>
                ))}
              </dl>
            </>
          ) : (
            <div className="text-center">
              <ShieldX className="mx-auto size-10 text-red-500" />
              <h1 className="mt-3 text-xl font-bold">Certificate not found</h1>
              <p className="mt-1 text-sm text-muted">We could not find an issued certificate for this code. Check the link, or contact Briwon Academy.</p>
            </div>
          )}
          <p className="mt-8 text-center text-sm"><Link href="/verify" className="text-brand-600 hover:underline">Verify another certificate</Link></p>
        </div>
      </div>
    </div>
  );
}
