import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full min-w-[640px] text-left text-sm", className)} {...props} />
    </div>
  );
}
export const THead = (p: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className="border-b border-line bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-muted" {...p} />
);
export const TBody = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody className="divide-y divide-line" {...p} />;
export const TR = ({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) => <tr className={cn("hover:bg-brand-50/40", className)} {...p} />;
export const TH = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => <th scope="col" className={cn("px-4 py-3 font-semibold", className)} {...p} />;
export const TD = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn("px-4 py-3 align-middle", className)} {...p} />;
