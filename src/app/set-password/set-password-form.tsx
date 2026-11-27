"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/client";
import { setPassword } from "@/lib/actions/auth";

export function SetPasswordForm() {
  const [state, action] = useActionState(setPassword, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) { toast.success("Password saved. Welcome!"); router.push(String(state.data?.redirect ?? "/")); }
    else if (state?.message) toast.error(state.message);
  }, [state, router]);
  return (
    <form action={action} className="space-y-4">
      <Field label="New password" name="password" error={state?.errors?.password} hint="At least 8 characters with a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm password" name="confirm" error={state?.errors?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton className="w-full" size="lg">Save password</SubmitButton>
    </form>
  );
}
