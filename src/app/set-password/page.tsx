import { redirect } from "next/navigation";
import { AuthShell } from "../auth-shell";
import { SetPasswordForm } from "./set-password-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Set your password" };

export default async function SetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=link");
  return (
    <AuthShell title={`Hi ${user.fullName.split(" ")[0]}, set your password`} subtitle="Choose a password only you know. The academy can never see it.">
      <SetPasswordForm />
    </AuthShell>
  );
}
