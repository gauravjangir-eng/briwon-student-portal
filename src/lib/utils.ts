import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ACADEMY_TZ = "Asia/Kolkata";

export function formatDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value.length === 10 ? value + "T00:00:00" : value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: value && typeof value === "string" && value.length === 10 ? undefined : ACADEMY_TZ, ...opts }).format(d);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: ACADEMY_TZ,
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: ACADEMY_TZ })
    .format(typeof value === "string" ? new Date(value) : value);
}

export function formatCurrency(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function pct(value: number | string | null | undefined, digits = 0) {
  if (value === null || value === undefined || value === "") return "—";
  return `${Number(value).toFixed(digits)}%`;
}

export function humanize(value: string | null | undefined) {
  if (!value) return "—";
  const s = value.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

/** Convert a local academy date + time ("2026-11-27", "10:00") to an ISO timestamp (IST, UTC+05:30). */
export function academyLocalToIso(date: string, time: string) {
  return new Date(`${date}T${time}:00+05:30`).toISOString();
}

/** ISO → "YYYY-MM-DDTHH:mm" in academy time for <input type="datetime-local"> */
export function isoToAcademyInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 330 * 60000);
  return d.toISOString().slice(0, 16);
}

export function academyInputToIso(value: string) {
  return new Date(`${value}:00+05:30`).toISOString();
}

export function todayInAcademy() {
  return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    let s = Array.isArray(v) ? v.join("; ") : String(v);
    // Prevent spreadsheet formula injection
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}
