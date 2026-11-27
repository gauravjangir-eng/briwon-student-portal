import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/client";
import { formatCurrency } from "@/lib/utils";
import { CourseForm } from "./course-form";

export const metadata = { title: "Courses" };

export default async function CoursesPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: courses } = await supabase.from("courses").select("*, modules(count), batches(count)").order("status").order("name");
  return (
    <>
      <PageHeader title="Courses & modules" description="Course catalogue, durations, fees and module order."
        actions={<Dialog wide title="New course" trigger={<Button><Plus /> New course</Button>}><CourseForm /></Dialog>} />
      {!courses?.length ? <Card><EmptyState icon={BookOpen} title="No courses yet" /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} href={`/admin/courses/${c.id}`} className="group">
              <Card className="h-full transition group-hover:border-brand-300">
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-lg bg-brand-50 px-2 py-1 font-mono text-xs font-bold text-brand-700">{c.code}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <h2 className="mt-3 text-lg font-bold group-hover:text-brand-700">{c.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{c.description || "No description"}</p>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                    <span>{c.duration_weeks} weeks</span><span>{formatCurrency(c.fee_amount)}</span>
                    <span>{(c.modules as unknown as { count: number }[])[0]?.count ?? 0} modules</span>
                    <span>{(c.batches as unknown as { count: number }[])[0]?.count ?? 0} batches</span>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
