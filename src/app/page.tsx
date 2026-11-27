import Link from "next/link";
import { ArrowRight, Award, CalendarCheck, ClipboardList, MapPin, ShieldCheck, Users } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { getCurrentUser, homeFor } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  const features = [
    { icon: Users, title: "Admissions to alumni", text: "Student IDs, enrollments, batches and transfers with full history." },
    { icon: MapPin, title: "GPS check-in", text: "Location-verified attendance only at check-in. No continuous tracking." },
    { icon: ClipboardList, title: "Assignments & projects", text: "Deadlines, submissions, reviews, marks and revision history." },
    { icon: CalendarCheck, title: "Live progress", text: "Attendance, assessment and fee status in one scorecard." },
    { icon: Award, title: "Verified certificates", text: "Automatic eligibility, admin approval, PDF and QR verification." },
    { icon: ShieldCheck, title: "Private by design", text: "Role-based access and row-level security on every record." },
  ];
  return (
    <div className="min-h-dvh bg-white">
      <header className="brand-gradient relative overflow-hidden text-white">
        <div className="grid-pattern absolute inset-0" aria-hidden />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <BrandLogo light />
          <Button asChild variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:border-white/40">
            <Link href={user ? homeFor(user.role) : "/login"}>{user ? "Open portal" : "Sign in"}</Link>
          </Button>
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">
            <span className="size-1.5 rounded-full bg-brand-400" /> Student management & learning portal
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] sm:text-6xl">
            Every step of the learning journey, <span className="text-brand-300">beautifully organised.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-brand-100">
            For Briwon Academy students, trainers and administrators. Classes, attendance, assignments, projects, certificates and career progress in one secure place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="accent"><Link href={user ? homeFor(user.role) : "/login"}>{user ? "Go to dashboard" : "Sign in to the portal"} <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:border-white/40"><Link href="/verify">Verify a certificate</Link></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto -mt-12 max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="relative rounded-2xl border border-line bg-white p-6 shadow-card">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><f.icon className="size-5" /></span>
              <h2 className="mt-4 text-lg font-bold">{f.title}</h2>
              <p className="mt-1.5 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
      <footer className="border-t border-line py-8 text-center text-sm text-muted">© {new Date().getFullYear()} Briwon Academy. All rights reserved.</footer>
    </div>
  );
}
