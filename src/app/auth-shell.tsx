import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="brand-gradient relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <div className="grid-pattern absolute inset-0" aria-hidden />
        <div className="relative"><Link href="/"><BrandLogo light /></Link></div>
        <div className="relative mt-auto max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-300">From admission to placement</p>
          <h2 className="mt-3 text-4xl font-extrabold leading-tight">One place for every step of your learning journey.</h2>
          <ul className="mt-8 space-y-3 text-brand-100">
            {["Timetable, GPS check-in and attendance", "Assignments, projects and feedback", "Certificate progress, internships and placements"].map((t) => (
              <li key={t} className="flex items-center gap-3"><span className="size-1.5 rounded-full bg-brand-400" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-brand-400/20 blur-3xl" aria-hidden />
      </section>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Link href="/"><BrandLogo /></Link></div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </div>
  );
}
