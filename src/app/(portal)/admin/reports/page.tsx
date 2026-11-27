import { Download, FileSpreadsheet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { SimpleBarChart } from "@/components/charts";

export const metadata = { title: "Reports & exports" };

const REPORTS = [
  { key: "students", title: "Students", text: "All students with ID, contact, course, batch and status." },
  { key: "attendance", title: "Attendance register", text: "Every attendance mark with session date and source (GPS / staff / correction)." },
  { key: "attendance-summary", title: "Attendance summary", text: "Attendance % per student per batch, with late weighting." },
  { key: "submissions", title: "Assignment submissions", text: "Submissions, timestamps, late flags, marks and review status." },
  { key: "fees", title: "Fees & balances", text: "Fee totals, paid, waived, balance and status per enrollment." },
  { key: "payments", title: "Payment history", text: "Every payment with receipt number, method and reference." },
  { key: "certificates", title: "Certificates", text: "Issued and revoked certificates with grade and number." },
  { key: "placements", title: "Placements", text: "Applications, companies, roles and outcomes." },
  { key: "leads", title: "Enquiries", text: "Admission enquiries, sources, status and follow-ups." },
];

export default async function ReportsPage() {
  const user = await requireRole("admin");
  const supabase = await createClient();
  const [batches, { data: enr }] = await Promise.all([batchOptions(supabase, user), supabase.from("enrollments").select("batches(code)").eq("status", "active")]);
  const perBatch = Object.entries((enr ?? []).reduce<Record<string, number>>((m, e) => { const k = e.batches?.code ?? "?"; m[k] = (m[k] ?? 0) + 1; return m; }, {})).map(([label, value]) => ({ label, value }));
  return (
    <>
      <PageHeader title="Reports & exports" description="Download CSV files that open in Excel or Google Sheets. Exports respect your access permissions." />
      <Card className="mb-6">
        <CardHeader title="Active students per batch" />
        <CardBody><SimpleBarChart data={perBatch} /></CardBody>
      </Card>
      <Card className="mb-6">
        <CardHeader title="Filters" description="Applied to the reports that support them (batch and date range)." />
        <CardBody>
          <form id="filters" className="grid gap-4 sm:grid-cols-3">
            <Select name="batch" defaultValue="" aria-label="Batch"><option value="">All batches</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}</Select>
            <Input name="from" type="date" aria-label="From date" />
            <Input name="to" type="date" aria-label="To date" />
          </form>
        </CardBody>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {REPORTS.map((r) => (
          <Card key={r.key}>
            <CardBody className="flex h-full flex-col">
              <FileSpreadsheet className="size-6 text-brand-500" />
              <h2 className="mt-3 font-bold">{r.title}</h2>
              <p className="mt-1 flex-1 text-sm text-muted">{r.text}</p>
              <Button form="filters" formAction={`/api/export/${r.key}`} formMethod="get" type="submit" variant="outline" size="sm" className="mt-4"><Download /> Download CSV</Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
