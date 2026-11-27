import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { MobileNav, Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole();
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);

  return (
    <div className="min-h-dvh">
      <Sidebar role={user.role} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur sm:px-6">
          <MobileNav role={user.role} />
          {user.role !== "student" ? (
            <form action="/students" method="get" className="relative hidden max-w-md flex-1 md:block" role="search">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input name="q" placeholder="Search students by name, ID, email or phone…" aria-label="Search students"
                className="h-10 w-full rounded-lg border border-line bg-canvas pl-9 pr-3 text-sm focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-3 focus:ring-brand-100" />
            </form>
          ) : <div className="flex-1" />}
          <div className="ml-auto flex items-center gap-2">
            <Link href="/notifications" className="relative grid size-10 place-items-center rounded-lg border border-line bg-white hover:bg-brand-50" aria-label={`Notifications${count ? `, ${count} unread` : ""}`}>
              <Bell className="size-5 text-ink" />
              {!!count && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-brand-400 px-1 text-[11px] font-bold text-white">{count > 99 ? "99+" : count}</span>}
            </Link>
            <UserMenu name={user.fullName} email={user.email} role={user.role} signOut={signOut} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
