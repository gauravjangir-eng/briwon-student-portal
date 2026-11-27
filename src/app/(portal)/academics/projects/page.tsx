import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { batchOptions } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/client";
import { formatDateTime } from "@/lib/utils";
import { ProjectForm } from "./project-form";

export const metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
  const user = await requireRole("admin", "trainer");
  const sp = await searchParams;
  const supabase = await createClient();
  const batches = await batchOptions(supabase, user);
  let q = supabase.from("projects").select("*, batches(code), project_submissions(status, presentation_status)").order("batch_id").order("kind", { ascending: false }).order("sequence");
  if (sp.batch) q = q.eq("batch_id", sp.batch);
  const { data } = await q;
  return (
    <>
      <PageHeader title="Projects" description="Four mini-projects and one capstone per batch, with reviews and presentations."
        actions={<Dialog wide title="New project" trigger={<Button><Plus /> New project</Button>}><ProjectForm batches={batches} /></Dialog>} />
      <Card>
        <FilterBar values={sp} placeholder="(filter by batch)" filters={[{ name: "batch", label: "Batch", options: batches.map((b) => ({ value: b.id, label: b.code })) }]} />
        {!data?.length ? <EmptyState icon={FolderKanban} title="No projects yet" /> : (
          <Table>
            <THead><TR><TH>Project</TH><TH>Batch</TH><TH>Deadline</TH><TH>Submissions</TH><TH>To review</TH><TH>Presentations done</TH></TR></THead>
            <TBody>
              {data.map((p) => {
                const s = p.project_submissions ?? [];
                return (
                  <TR key={p.id}>
                    <TD><Link href={`/academics/projects/${p.id}`} className="font-semibold text-brand-700 hover:underline">{p.title}</Link>
                      <p className="mt-0.5"><Badge tone={p.kind === "capstone" ? "violet" : "blue"}>{p.kind === "capstone" ? "Capstone" : `Mini-project ${p.sequence}`}</Badge></p></TD>
                    <TD>{p.batches?.code}</TD>
                    <TD className="whitespace-nowrap text-xs">{formatDateTime(p.deadline)}</TD>
                    <TD>{s.length}</TD>
                    <TD>{s.filter((x) => x.status === "submitted" || x.status === "under_review").length || "—"}</TD>
                    <TD>{p.requires_presentation || p.kind === "capstone" ? s.filter((x) => x.presentation_status === "completed").length : "n/a"}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
