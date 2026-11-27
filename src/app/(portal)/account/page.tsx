import { requireRole } from "@/lib/auth";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { InfoNote, PageHeader } from "@/components/ui/misc";
import { ActionForm, FormField, SubmitButton } from "@/components/ui/client";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/lib/actions/common";

export const metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ missing?: string }> }) {
  const user = await requireRole();
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Account & security" description={`${user.email} · ${user.role}`} />
      {sp.missing && <div className="mb-6"><InfoNote tone="amber">Your sign-in is not linked to a student record yet. Please contact the academy office.</InfoNote></div>}
      <Card className="max-w-lg">
        <CardHeader title="Change password" description="Your password is private. Academy staff can never see it." />
        <CardBody>
          <ActionForm action={changePassword} resetOnSuccess>
            <FormField label="Current password" name="current" required><Input id="current" name="current" type="password" autoComplete="current-password" /></FormField>
            <FormField label="New password" name="password" required hint="At least 8 characters with a letter and a number"><Input id="password" name="password" type="password" autoComplete="new-password" /></FormField>
            <FormField label="Confirm new password" name="confirm" required><Input id="confirm" name="confirm" type="password" autoComplete="new-password" /></FormField>
            <div className="flex justify-end"><SubmitButton>Change password</SubmitButton></div>
          </ActionForm>
        </CardBody>
      </Card>
    </>
  );
}
