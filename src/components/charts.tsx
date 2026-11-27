"use client";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const CHART_COLORS = ["#244879", "#4C89C8", "#82acdc", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#94a3b8"];

export function SimpleBarChart({ data, height = 240, color = "#4C89C8" }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-muted">No data yet</p>;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5b6b80" }} tickLine={false} axisLine={false} interval={0} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5b6b80" }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "#eef4fb" }} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({ data, height = 220, centerLabel }: { data: { label: string; value: number; color?: string }[]; height?: number; centerLabel?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="py-10 text-center text-sm text-muted">No data yet</p>;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div style={{ height, width: height }} className="relative shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="none">
              {data.map((d, i) => <Cell key={d.label} fill={d.color ?? CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        {centerLabel && <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><span className="font-display text-xl font-bold">{centerLabel}</span></div>}
      </div>
      <ul className="min-w-[140px] flex-1 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: d.color ?? CHART_COLORS[i % CHART_COLORS.length] }} />{d.label}</span>
            <span className="font-semibold">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
