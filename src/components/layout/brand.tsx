import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect width="40" height="40" rx="11" fill="#244879" />
      <path d="M11 10h10.5c4.4 0 7 2.2 7 5.6 0 2.3-1.3 3.9-3.3 4.6 2.6.6 4.3 2.5 4.3 5.2 0 3.8-2.9 6.1-7.6 6.1H11V10Zm5.2 4.3v4.4h4.6c1.6 0 2.6-.8 2.6-2.2s-1-2.2-2.6-2.2h-4.6Zm0 8.4v4.9h5.2c1.8 0 2.9-.9 2.9-2.5s-1.1-2.4-2.9-2.4h-5.2Z" fill="#fff" />
      <circle cx="31" cy="10" r="3.2" fill="#4C89C8" />
    </svg>
  );
}

export function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      <span className="leading-tight">
        <span className={cn("block font-display text-[15px] font-bold", light ? "text-white" : "text-brand-700")}>Briwon Academy</span>
        <span className={cn("block text-[11px] font-medium uppercase tracking-[0.14em]", light ? "text-brand-200" : "text-brand-400")}>Student Portal</span>
      </span>
    </span>
  );
}
