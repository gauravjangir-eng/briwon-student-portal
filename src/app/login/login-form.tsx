"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/client";
import { ErrorNote } from "@/components/ui/misc";
import { signIn } from "@/lib/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, null);
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && <ErrorNote message={state.message ?? "Sign in failed"} />}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" name="email" error={state?.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </Field>
      <Field label="Password" name="password" error={state?.errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full" size="lg" pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
