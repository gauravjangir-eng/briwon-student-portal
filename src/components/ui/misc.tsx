import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, back }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
            <ChevronLeft className="size-4" /> {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold text-ink sm:text-[1.7rem]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = "brand", href }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: LucideIcon; tone?: "brand" | "green" | "amber" | "red" | "violet"; href?: string }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700", violet: "bg-violet-50 text-violet-700",
  };
  const body = (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-card transition hover:border-brand-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        {Icon && <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tones[tone])}><Icon className="size-5" /></span>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block focus-visible:rounded-2xl">{body}</Link> : body;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: { title: string; description?: string; icon?: LucideIcon; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Icon className="size-6" /></span>
      <p className="mt-3 font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>;
}

export function InfoNote({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "amber" }) {
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm", tone === "blue" ? "border-brand-200 bg-brand-50 text-brand-800" : "border-amber-200 bg-amber-50 text-amber-900")}>
      {children}
    </div>
  );
}

export function Progress({ value, tone = "brand", className }: { value: number; tone?: "brand" | "green" | "amber" | "red"; className?: string }) {
  const c = { brand: "bg-brand-400", green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" }[tone];
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all", c)} style={{ width: `${v}%` }} />
    </div>
  );
}

/** Server-rendered pagination using ?page= */
export function Pagination({ page, pageSize, total, searchParams, basePath }: { page: number; pageSize: number; total: number; searchParams: Record<string, string | undefined>; basePath: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams(Object.entries(searchParams).filter(([, v]) => v) as [string, string][]);
    sp.set("page", String(p));
    return `${basePath}?${sp}`;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
      <span>{from}–{Math.min(page * pageSize, total)} of {total}</span>
      <div className="flex items-center gap-1">
        <PageLink href={href(page - 1)} disabled={page <= 1} label="Previous page"><ChevronLeft className="size-4" /></PageLink>
        <span className="px-2 font-medium text-ink">{page} / {pages}</span>
        <PageLink href={href(page + 1)} disabled={page >= pages} label="Next page"><ChevronRight className="size-4" /></PageLink>
      </div>
    </div>
  );
}
function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  const cls = "grid size-8 place-items-center rounded-lg border border-line bg-white";
  return disabled ? <span aria-disabled className={cn(cls, "opacity-40")}>{children}</span> : <Link aria-label={label} href={href} className={cn(cls, "hover:bg-brand-50")}>{children}</Link>;
}

export function DescriptionList({ items, cols = 2 }: { items: [string, React.ReactNode][]; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", cols === 1 ? "" : cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">{k}</dt>
          <dd className="mt-1 break-words text-sm text-ink">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
