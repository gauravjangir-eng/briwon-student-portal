import { Search } from "lucide-react";
import { Input, Select } from "./input";
import { Button } from "./button";

export type FilterDef = { name: string; label: string; options: { value: string; label: string }[] };

/** Plain GET form: works without JavaScript and keeps filters in the URL. */
export function FilterBar({ q, filters = [], values = {}, placeholder = "Search…", extra }: { q?: string; filters?: FilterDef[]; values?: Record<string, string | undefined>; placeholder?: string; extra?: React.ReactNode }) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2 border-b border-line p-4">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input name="q" defaultValue={q} placeholder={placeholder} className="pl-9" aria-label="Search" />
      </div>
      {filters.map((f) => (
        <Select key={f.name} name={f.name} defaultValue={values[f.name] ?? ""} aria-label={f.label} className="w-auto min-w-[150px]">
          <option value="">{f.label}: All</option>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      ))}
      {extra}
      <Button type="submit" variant="outline">Apply</Button>
    </form>
  );
}
