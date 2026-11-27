"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/client";
import { InfoNote } from "@/components/ui/misc";
import { admitStudent } from "@/lib/actions/admin";
import { todayInAcademy } from "@/lib/utils";

type Props = { courses: { id: string; name: string; fee: number }[]; batches: { id: string; label: string; course_id: string }[]; canInvite: boolean };

export function AdmissionForm({ courses, batches, canInvite }: Props) {
  const [state, action] = useActionState(admitStudent, null);
  const [course, setCourse] = useState("");
  const [fee, setFee] = useState("");
  const router = useRouter();
  const e = state?.errors ?? {};

  useEffect(() => {
    if (!state) return;
    if (state.ok) { toast.success(state.message); router.push(`/students/${state.data?.studentId}`); }
    else toast.error(state.message);
  }, [state, router]);

  return (
    <form action={action} className="space-y-6" noValidate>
      <Card>
        <CardHeader title="Student details" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="full_name" required error={e.full_name}><Input id="full_name" name="full_name" autoComplete="off" /></Field>
          <Field label="Email" name="email" required error={e.email} hint="Used for the account invitation"><Input id="email" name="email" type="email" /></Field>
          <Field label="Phone number" name="phone" required error={e.phone}><Input id="phone" name="phone" type="tel" placeholder="+91 98xxx xxxxx" /></Field>
          <Field label="Date of birth" name="date_of_birth" error={e.date_of_birth}><Input id="date_of_birth" name="date_of_birth" type="date" /></Field>
          <Field label="Address" name="address" className="sm:col-span-2" error={e.address}><Textarea id="address" name="address" className="min-h-20" /></Field>
          <Field label="Emergency contact name" name="emergency_contact_name" required error={e.emergency_contact_name}><Input id="emergency_contact_name" name="emergency_contact_name" /></Field>
          <Field label="Emergency contact phone" name="emergency_contact_phone" required error={e.emergency_contact_phone}><Input id="emergency_contact_phone" name="emergency_contact_phone" type="tel" /></Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Course, batch & fees" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Course" name="course_id" required error={e.course_id}>
            <Select id="course_id" name="course_id" value={course} onChange={(ev) => { setCourse(ev.target.value); const c = courses.find((x) => x.id === ev.target.value); if (c) setFee(String(c.fee)); }}>
              <option value="" disabled>Select a course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Batch" name="batch_id" required error={e.batch_id} hint={course && !batches.some((b) => b.course_id === course) ? "No open batches for this course. Create one first." : undefined}>
            <Select id="batch_id" name="batch_id" defaultValue="" key={course} disabled={!course}>
              <option value="" disabled>{course ? "Select a batch" : "Choose a course first"}</option>
              {batches.filter((b) => b.course_id === course).map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </Select>
          </Field>
          <Field label="Admission date" name="admission_date" required error={e.admission_date}><Input id="admission_date" name="admission_date" type="date" defaultValue={todayInAcademy()} /></Field>
          <Field label="Student status" name="status" error={e.status}>
            <Select id="status" name="status" defaultValue="active"><option value="active">Active</option><option value="inactive">Inactive</option></Select>
          </Field>
          <Field label="Fee amount (₹)" name="fee_amount" required error={e.fee_amount} hint="Defaults to the course fee. Status starts as Pending until a payment is recorded.">
            <Input id="fee_amount" name="fee_amount" type="number" min={0} step="1" value={fee} onChange={(ev) => setFee(ev.target.value)} />
          </Field>
          <Field label="Fee due date" name="fee_due" error={e.fee_due}><Input id="fee_due" name="fee_due" type="date" /></Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Admission documents" description="PDF, PNG, JPG or WEBP up to 10 MB each. Stored privately." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          {[["doc_id_proof", "ID proof"], ["doc_photo", "Profile photo (image)"], ["doc_education", "Education certificate"], ["doc_admission_form", "Signed admission form"]].map(([n, l]) => (
            <Field key={n} label={l} name={n}><Input id={n} name={n} type="file" accept={n === "doc_photo" ? ".png,.jpg,.jpeg,.webp" : ".pdf,.png,.jpg,.jpeg,.webp"} className="py-1.5" /></Field>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          {canInvite ? (
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" name="send_invite" defaultChecked className="size-4 accent-brand-700" />
              Email the student an invitation to set their own password
            </label>
          ) : <InfoNote tone="amber">Invitations are disabled until <code>SUPABASE_SERVICE_ROLE_KEY</code> is configured. You can send the invite later from the student profile.</InfoNote>}
          <SubmitButton size="lg" pendingText="Admitting…">Admit student</SubmitButton>
        </CardBody>
      </Card>
    </form>
  );
}
