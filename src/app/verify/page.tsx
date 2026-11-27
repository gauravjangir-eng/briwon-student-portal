import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Verify a certificate" };

async function go(formData: FormData) {
  "use server";
  const raw = String(formData.get("code") ?? "").trim();
  const match = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  redirect(match ? `/verify/${match[0].toLowerCase()}` : "/verify?invalid=1");
}

export default async function VerifyIndex({ searchParams }: { searchParams: Promise<{ invalid?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-card">
        <Link href="/"><BrandLogo /></Link>
        <h1 className="mt-6 text-2xl font-bold">Verify a certificate</h1>
        <p className="mt-1 text-sm text-muted">Scan the QR code on the certificate, or paste the verification link or code printed below it.</p>
        <form action={go} className="mt-6 space-y-3">
          <Input name="code" placeholder="Verification link or code" aria-label="Verification code" required />
          {sp.invalid && <p className="text-sm text-red-600">That does not look like a valid verification code.</p>}
          <Button type="submit" className="w-full">Verify</Button>
        </form>
      </div>
    </div>
  );
}
