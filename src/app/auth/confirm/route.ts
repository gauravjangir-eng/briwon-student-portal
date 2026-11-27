import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Handles invitation, password-recovery and magic links (token_hash or PKCE code). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/set-password";
  const next = /^\/(?![/\\])/.test(nextParam) ? nextParam : "/set-password";

  const supabase = await createClient();
  let failed = true;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    failed = Boolean(error);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  }
  if (failed) return NextResponse.redirect(`${origin}/login?error=link`);
  return NextResponse.redirect(`${origin}${next}`);
}
