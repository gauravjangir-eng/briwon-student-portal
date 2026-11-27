import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { ActionForm, FormField, SubmitButton } from "@/components/ui/client";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/actions/auth";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a secure link to choose a new password.">
      <ActionForm action={requestPasswordReset} resetOnSuccess>
        <FormField label="Email" name="email"><Input id="email" name="email" type="email" required autoComplete="email" /></FormField>
        <SubmitButton className="w-full" size="lg" pendingText="Sending…">Send reset link</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm"><Link href="/login" className="font-medium text-brand-600 hover:underline">Back to sign in</Link></p>
    </AuthShell>
  );
}
