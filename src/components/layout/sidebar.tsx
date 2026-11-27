"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV } from "./nav";
import { BrandLogo } from "./brand";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth";

function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const path = usePathname();
  const all = NAV[role].flatMap((s) => s.items.map((i) => i.href));
  // Most specific matching href wins
  const active = all.filter((h) => path === h || path.startsWith(h + "/")).sort((a, b) => b.length - a.length)[0];
  return (
    <nav className="space-y-5" aria-label="Main">
      {NAV[role].map((section, i) => (
        <div key={i}>
          {section.title && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-300/80">{section.title}</p>}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const isActive = item.href === active;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                      isActive ? "bg-white text-brand-700 shadow-sm" : "text-brand-100 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <item.icon className={cn("size-[18px]", isActive ? "text-brand-400" : "text-brand-300")} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="brand-gradient fixed inset-y-0 left-0 z-30 hidden w-64 flex-col lg:flex">
      <div className="px-5 py-5"><Link href="/"><BrandLogo light /></Link></div>
      <div className="flex-1 overflow-y-auto px-3 pb-6"><NavLinks role={role} /></div>
    </aside>
  );
}

export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  return (
    <>
      <button className="grid size-10 place-items-center rounded-lg border border-line bg-white lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-brand-950/50" onClick={() => setOpen(false)} />
          <div className="brand-gradient absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col">
            <div className="flex items-center justify-between px-5 py-5">
              <BrandLogo light />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-1 text-white hover:bg-white/10"><X className="size-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-6"><NavLinks role={role} onNavigate={() => setOpen(false)} /></div>
          </div>
        </div>
      )}
    </>
  );
}
