import { FileText } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActionForm, FormField, SubmitButton } from "@/components/ui/client";
import { Input, Select } from "@/components/ui/input";
import { uploadStudentDocument } from "@/lib/actions/admin";
import { fileUrl } from "@/lib/storage";
import { formatDateTime, humanize } from "@/lib/utils";

export const metadata = { title: "My documents" };

export default async function MyDocuments() {
  const user = await requireStudent();
  const supabase = await createClient();
  const { data: docs } = await supabase.from("student_documents").select("*").eq("student_id", user.studentId).order("created_at", { ascending: false });
  return (
    <>
      <PageHeader title="My documents" description="Your documents are private. Only you and academy administrators can open them." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Upload a document" />
          <CardBody>
            <ActionForm action={uploadStudentDocument} resetOnSuccess>
              <input type="hidden" name="student_id" value={user.studentId} />
              <FormField label="Type" name="doc_type"><Select id="doc_type" name="doc_type">{["id_proof", "address_proof", "photo", "education", "other"].map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</Select></FormField>
              <FormField label="File" name="file" hint="PDF, PNG, JPG or WEBP up to 10 MB"><Input id="file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="py-1.5" /></FormField>
              <SubmitButton className="w-full">Upload</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Uploaded documents" />
          {!docs?.length ? <EmptyState icon={FileText} title="No documents yet" /> : (
            <Table>
              <THead><TR><TH>Type</TH><TH>File</TH><TH>Uploaded</TH><TH>Status</TH></TR></THead>
              <TBody>{docs.map((d) => <TR key={d.id}><TD>{humanize(d.doc_type)}</TD><TD><a className="text-brand-600 hover:underline" href={fileUrl("student-files", d.file_path)!}>{d.file_name}</a></TD><TD className="text-xs">{formatDateTime(d.created_at)}</TD><TD>{d.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending check</Badge>}</TD></TR>)}</TBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
