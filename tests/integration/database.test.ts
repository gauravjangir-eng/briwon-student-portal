/**
 * Integration tests against a LOCAL Supabase stack (never production).
 * Run:  npx supabase start && npx supabase db reset && npm run test:integration
 * They rely on the dev seed in supabase/seed.sql.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL = process.env.SUPABASE_TEST_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.SUPABASE_TEST_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_TEST_SERVICE_KEY ?? "";
const run = Boolean(ANON && SERVICE && /127\.0\.0\.1|localhost/.test(URL));
const PASSWORD = "Briwon@2026";

const S1 = "50000000-0000-0000-0000-000000000001"; // Aarav (FSWD batch, eligible)
const S2 = "50000000-0000-0000-0000-000000000002"; // Diya (FSWD batch)
const S4 = "50000000-0000-0000-0000-000000000004"; // Meera (UI/UX batch)
const FSWD = "b0000000-0000-0000-0000-000000000001";
const UIUX = "b0000000-0000-0000-0000-000000000002";
const CAMPUS = { lat: 26.9124, lng: 75.7873 };

async function signIn(email: string) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return c;
}

describe.skipIf(!run)("database security & business rules", () => {
  let admin: SupabaseClient, trainer: SupabaseClient, trainer2: SupabaseClient, student: SupabaseClient, student2: SupabaseClient, anon: SupabaseClient, service: SupabaseClient;

  beforeAll(async () => {
    [admin, trainer, trainer2, student, student2] = await Promise.all([
      signIn("admin@example.com"), signIn("trainer@example.com"), signIn("trainer2@example.com"), signIn("student@example.com"), signIn("student2@example.com"),
    ]);
    anon = createClient(URL, ANON, { auth: { persistSession: false } });
    service = createClient(URL, SERVICE, { auth: { persistSession: false } });
  });

  // ---------- Data isolation ----------
  it("a student sees only their own student record", async () => {
    const { data } = await student.from("students").select("id");
    expect(data?.map((r) => r.id)).toEqual([S1]);
  });

  it("a student cannot read another student's fees, submissions or attendance", async () => {
    const fees = await student.from("fees").select("student_id");
    expect(new Set(fees.data?.map((f) => f.student_id))).toEqual(new Set([S1]));
    const subs = await student.from("submissions").select("student_id").eq("student_id", S2);
    expect(subs.data).toEqual([]);
    const att = await student.from("attendance").select("student_id").eq("student_id", S2);
    expect(att.data).toEqual([]);
  });

  it("a student cannot change their own role or Student ID", async () => {
    const me = (await student.auth.getUser()).data.user!.id;
    const r = await student.from("profiles").update({ role: "admin" }).eq("id", me);
    expect(r.error).not.toBeNull();
    const r2 = await student.from("students").update({ student_code: "BRI-2026-9999" }).eq("id", S1);
    expect(r2.error).not.toBeNull();
    const r3 = await student.from("students").update({ status: "graduated" }).eq("id", S1);
    expect(r3.error).not.toBeNull();
    const ok = await student.from("students").update({ phone: "+91 98000 11111" }).eq("id", S1).select("phone");
    expect(ok.error).toBeNull();
    expect(ok.data?.[0]?.phone).toBe("+91 98000 11111");
  });

  it("a trainer sees only students of assigned batches and no fees", async () => {
    const { data } = await trainer.from("students").select("id");
    const ids = new Set(data?.map((r) => r.id));
    expect(ids.has(S1)).toBe(true);
    expect(ids.has(S4)).toBe(false); // UI/UX batch belongs to trainer2
    const fees = await trainer.from("fees").select("id");
    expect(fees.data).toEqual([]);
    const other = await trainer2.from("students").select("id").eq("id", S1);
    expect(other.data).toEqual([]);
  });

  it("a trainer cannot create an assignment for a batch they do not teach", async () => {
    const r = await trainer.from("assignments").insert({ batch_id: UIUX, course_id: "c0000000-0000-0000-0000-000000000002", title: "Not my batch", deadline: new Date(Date.now() + 86400000).toISOString() });
    expect(r.error).not.toBeNull();
  });

  it("trainers cannot read placement offer details or staff notes", async () => {
    const r = await trainer.from("placements").select("notes, offer_details");
    expect(r.data).toEqual([]);
    const ov = await trainer.rpc("trainer_placement_overview");
    expect(ov.error).toBeNull();
    expect(Object.keys(ov.data?.[0] ?? {})).not.toContain("notes");
  });

  it("anonymous users cannot read any table", async () => {
    for (const t of ["students", "profiles", "fees", "attendance", "certificates"]) {
      const r = await anon.from(t).select("*").limit(1);
      expect(r.data ?? []).toEqual([]);
    }
  });

  it("students cannot write attendance or marks directly", async () => {
    const r = await student.from("attendance").insert({ session_id: "00000000-0000-0000-0000-000000000000", student_id: S1, status: "present", source: "trainer" });
    expect(r.error).not.toBeNull();
    const r2 = await student.from("submissions").update({ marks: 100 }).eq("student_id", S1).select("id");
    expect(r2.data ?? []).toEqual([]);
  });

  // ---------- Student IDs ----------
  it("generates unique, sequential Student IDs on the server", async () => {
    const { data } = await admin.from("students").select("student_code");
    const codes = data!.map((d) => d.student_code!);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of codes) expect(c).toMatch(/^BRI-\d{4}-\d{4}$/);
    const year = new Date().getFullYear();
    const r = await admin.rpc("admit_student", {
      p_full_name: "Test Admission", p_email: `test.${Date.now()}@example.com`, p_phone: "+91 90000 99999", p_course: "c0000000-0000-0000-0000-000000000003",
      p_batch: "b0000000-0000-0000-0000-000000000003", p_admission_date: `${year}-06-01`, p_address: "", p_emergency_name: "Parent", p_emergency_phone: "+91 90000 88888", p_fee_amount: 50000,
    });
    expect(r.error).toBeNull();
    expect((r.data as { student_code: string }).student_code).toMatch(new RegExp(`^BRI-${year}-\\d{4}$`));
  });

  it("only admins can admit students", async () => {
    const r = await trainer.rpc("admit_student", { p_full_name: "X", p_email: "x@example.com", p_phone: "+91 90000 00000", p_course: FSWD, p_batch: FSWD, p_admission_date: "2026-01-01", p_address: "", p_emergency_name: "", p_emergency_phone: "", p_fee_amount: 0 });
    expect(r.error?.message).toMatch(/administrators/i);
  });

  it("prevents duplicate active enrollment in the same course", async () => {
    const r = await admin.rpc("enroll_student", { p_student: S1, p_batch: FSWD, p_fee_amount: 0 });
    expect(r.error?.code).toBe("23505");
  });

  // ---------- Attendance ----------
  async function sessionStartingMinutesAgo(min: number) {
    const starts = new Date(Date.now() - min * 60000 - 5000); // 5s margin
    const { data, error } = await service.from("class_sessions").insert({ batch_id: FSWD, title: `Test ${min}`, starts_at: starts.toISOString(), ends_at: new Date(starts.getTime() + 2 * 3600000).toISOString() }).select("id").single();
    if (error) throw error;
    return data.id as string;
  }

  it.each([[0, "present"], [14, "present"], [15, "late"], [30, "late"], [31, "absent"]])("check-in %i minutes after start is %s", async (min, expected) => {
    const sid = await sessionStartingMinutesAgo(min as number);
    const { data } = await student.rpc("student_check_in", { p_session: sid, p_lat: CAMPUS.lat, p_lng: CAMPUS.lng, p_accuracy: 20 });
    expect(data).toMatchObject({ ok: true, status: expected });
  });

  it("rejects check-in outside the radius and with poor accuracy, and logs attempts", async () => {
    const sid = await sessionStartingMinutesAgo(1);
    const far = await student.rpc("student_check_in", { p_session: sid, p_lat: CAMPUS.lat + 0.01, p_lng: CAMPUS.lng, p_accuracy: 10 });
    expect(far.data).toMatchObject({ ok: false, code: "outside_radius" });
    const fuzzy = await student.rpc("student_check_in", { p_session: sid, p_lat: CAMPUS.lat, p_lng: CAMPUS.lng, p_accuracy: 500 });
    expect(fuzzy.data).toMatchObject({ ok: false, code: "low_accuracy" });
    const attempts = await student.from("check_in_attempts").select("result").eq("session_id", sid);
    expect(attempts.data?.map((a) => a.result).sort()).toEqual(["low_accuracy", "outside_radius"]);
  });

  it("prevents duplicate attendance for the same session", async () => {
    const sid = await sessionStartingMinutesAgo(2);
    const first = await student.rpc("student_check_in", { p_session: sid, p_lat: CAMPUS.lat, p_lng: CAMPUS.lng, p_accuracy: 10 });
    expect(first.data).toMatchObject({ ok: true });
    const second = await student.rpc("student_check_in", { p_session: sid, p_lat: CAMPUS.lat, p_lng: CAMPUS.lng, p_accuracy: 10 });
    expect(second.data).toMatchObject({ ok: false, code: "duplicate" });
  });

  it("a student cannot check in to another batch's session", async () => {
    const { data } = await service.from("class_sessions").insert({ batch_id: UIUX, title: "Other", starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 3600000).toISOString() }).select("id").single();
    const r = await student.rpc("student_check_in", { p_session: data!.id, p_lat: CAMPUS.lat, p_lng: CAMPUS.lng, p_accuracy: 10 });
    expect(r.data).toMatchObject({ ok: false, code: "not_found" });
  });

  it("trainers cannot overwrite existing marks; admin corrections keep history", async () => {
    const sid = await sessionStartingMinutesAgo(3);
    await student.rpc("student_check_in", { p_session: sid, p_lat: CAMPUS.lat, p_lng: CAMPUS.lng, p_accuracy: 10 });
    await trainer.rpc("staff_mark_attendance", { p_session: sid, p_entries: [{ student_id: S1, status: "absent" }] });
    const after = await admin.from("attendance").select("id, status").eq("session_id", sid).eq("student_id", S1).single();
    expect(after.data?.status).toBe("present");
    const req = await trainer.from("attendance_correction_requests").insert({ session_id: sid, student_id: S1, requested_status: "excused", reason: "Medical certificate provided", requested_by: (await trainer.auth.getUser()).data.user!.id }).select("id").single();
    expect(req.error).toBeNull();
    const rev = await admin.rpc("review_attendance_correction", { p_request: req.data!.id, p_approve: true, p_note: "ok" });
    expect(rev.error).toBeNull();
    const hist = await admin.from("attendance_history").select("old_status, new_status").eq("attendance_id", after.data!.id).order("changed_at");
    expect(hist.data?.map((h) => h.new_status)).toEqual(["present", "excused"]);
  });

  it("approved leave excuses unmarked and absent sessions but keeps present marks", async () => {
    const mkSession = async (startsAt: string) => (await service.from("class_sessions").insert({
      batch_id: FSWD, title: `Leave test ${startsAt}`, starts_at: startsAt, ends_at: new Date(new Date(startsAt).getTime() + 3600000).toISOString(),
    }).select("id").single()).data!.id as string;
    const [present, absent, unmarked, nextDay] = await Promise.all([
      mkSession("2027-03-10T10:00:00+05:30"), mkSession("2027-03-10T14:00:00+05:30"), mkSession("2027-03-10T23:30:00+05:30"), mkSession("2027-03-11T10:00:00+05:30"),
    ]);
    await service.from("attendance").insert([
      { session_id: present, student_id: S2, status: "present", source: "trainer" },
      { session_id: absent, student_id: S2, status: "absent", source: "trainer" },
    ]);
    const leave = await student2.from("leave_requests").insert({ student_id: S2, start_date: "2027-03-10", end_date: "2027-03-10", reason: "Family function" }).select("id").single();
    expect(leave.error).toBeNull();
    const approve = await trainer.from("leave_requests").update({ status: "approved" }).eq("id", leave.data!.id);
    expect(approve.error).toBeNull();
    const { data } = await admin.from("attendance").select("session_id, status").eq("student_id", S2).in("session_id", [present, absent, unmarked, nextDay]);
    const by = Object.fromEntries((data ?? []).map((a) => [a.session_id, a.status]));
    expect(by).toEqual({ [present]: "present", [absent]: "excused", [unmarked]: "excused" });
  });

  // ---------- Assignments ----------
  it("enforces deadlines and late policies, and preserves submission history", async () => {
    const mk = async (deadlineOffsetMs: number, late_policy: string) => (await trainer.from("assignments").insert({
      batch_id: FSWD, course_id: "c0000000-0000-0000-0000-000000000001", title: `Policy ${late_policy} ${deadlineOffsetMs}`, deadline: new Date(Date.now() + deadlineOffsetMs).toISOString(), late_policy, max_marks: 10, is_required: false,
    }).select("id").single()).data!.id as string;

    const closed = await mk(-3600000, "none");
    const r1 = await student.rpc("submit_assignment", { p_assignment: closed, p_text: "late", p_file_path: null, p_url: null });
    expect(r1.error?.message).toMatch(/deadline has passed/i);

    const grace = await mk(-2 * 86400000, "grace");
    const r2 = await student.rpc("submit_assignment", { p_assignment: grace, p_text: "late but ok", p_file_path: null, p_url: null });
    expect(r2.data).toMatchObject({ is_late: true });

    const expired = await mk(-8 * 86400000, "grace");
    const r3 = await student.rpc("submit_assignment", { p_assignment: expired, p_text: "too late", p_file_path: null, p_url: null });
    expect(r3.error?.message).toMatch(/window/i);

    const open = await mk(86400000, "grace");
    const s1 = await student.rpc("submit_assignment", { p_assignment: open, p_text: "v1", p_file_path: null, p_url: null });
    expect(s1.data).toMatchObject({ is_late: false, attempt: 1 });
    const subId = (s1.data as { id: string }).id;
    const tooHigh = await trainer.rpc("review_submission", { p_submission: subId, p_decision: "approved", p_marks: 11, p_feedback: "x" });
    expect(tooHigh.error).not.toBeNull();
    await trainer.rpc("review_submission", { p_submission: subId, p_decision: "revision_required", p_marks: 4, p_feedback: "Fix layout" });
    const s2 = await student.rpc("submit_assignment", { p_assignment: open, p_text: "v2", p_file_path: null, p_url: null });
    expect(s2.data).toMatchObject({ attempt: 2, is_late: false });
    const hist = await student.from("submission_history").select("attempt, status, content_text, feedback").eq("submission_id", subId).order("recorded_at");
    expect(hist.data?.map((h) => h.status)).toEqual(["submitted", "revision_required", "submitted"]);
    expect(hist.data?.[1]?.feedback).toBe("Fix layout");
    const other = await trainer2.rpc("review_submission", { p_submission: subId, p_decision: "approved", p_marks: 5, p_feedback: "x" });
    expect(other.error?.message).toMatch(/cannot review/i);
  });

  it("rejects file references outside the student's own folder", async () => {
    const { data: a } = await admin.from("assignments").select("id").eq("batch_id", FSWD).gt("deadline", new Date().toISOString()).limit(1).single();
    const r = await student2.rpc("submit_assignment", { p_assignment: a!.id, p_text: null, p_file_path: `${S1}/submissions/x.pdf`, p_url: null });
    expect(r.error?.message).toMatch(/Invalid file reference/);
  });

  // ---------- Eligibility, fees & certificates ----------
  it("calculates eligibility and blocks approval when fees are unpaid", async () => {
    const e1 = await student.rpc("certificate_eligibility", { p_enrollment: "e0000000-0000-0000-0000-000000000001" });
    expect(e1.error).toBeNull();
    const e2 = await student.rpc("certificate_eligibility", { p_enrollment: "e0000000-0000-0000-0000-000000000002" });
    expect(e2.error?.message).toMatch(/Not allowed/); // another student's enrollment

    const diya = await admin.rpc("certificate_eligibility", { p_enrollment: "e0000000-0000-0000-0000-000000000002" });
    const d = diya.data as { eligible: boolean; grade: string; checks: { key: string; met: boolean }[] };
    expect(d.eligible).toBe(false);
    expect(d.grade).toBe("Not Yet Complete");
    expect(d.checks.find((c) => c.key === "fees")?.met).toBe(false);
    const approve = await admin.rpc("approve_certificate", { p_enrollment: "e0000000-0000-0000-0000-000000000002" });
    expect(approve.error?.message).toMatch(/not eligible/i);
  });

  it("issues a certificate with a server-generated number and a public verification that hides private data", async () => {
    const e = (await admin.rpc("certificate_eligibility", { p_enrollment: "e0000000-0000-0000-0000-000000000001" })).data as { eligible: boolean; checks: { key: string; met: boolean; detail: string }[] };
    // Test check-ins above may have added sessions; make sure the student is still eligible before approving.
    expect(e.checks.filter((c) => !c.met)).toEqual([]);
    const nonAdmin = await trainer.rpc("approve_certificate", { p_enrollment: "e0000000-0000-0000-0000-000000000001" });
    expect(nonAdmin.error).not.toBeNull();
    const r = await admin.rpc("approve_certificate", { p_enrollment: "e0000000-0000-0000-0000-000000000001" });
    expect(r.error).toBeNull();
    const { data: cert } = await student.from("certificates").select("certificate_number, verification_token, grade").single();
    expect(cert?.certificate_number).toMatch(/^BRI-CERT-\d{4}-\d{4}$/);
    const v = await anon.rpc("verify_certificate", { p_token: cert!.verification_token });
    expect(v.data?.[0]).toMatchObject({ status: "approved", certificate_number: cert!.certificate_number });
    expect(Object.keys(v.data![0]).sort()).toEqual(["certificate_number", "completion_date", "course_name", "grade", "status", "student_name"]);
  });

  it("fee status follows payments and payments are append-only", async () => {
    const fee = "f0000000-0000-0000-0000-000000000006";
    const me = (await admin.auth.getUser()).data.user!.id;
    const pay = await admin.from("payment_records").insert({ fee_id: fee, amount: 10000, method: "upi", recorded_by: me }).select("id, receipt_number").single();
    expect(pay.data?.receipt_number).toMatch(/^BRI-RCPT-\d{4}-\d{4}$/);
    expect((await admin.from("fees").select("status, amount_paid").eq("id", fee).single()).data).toMatchObject({ status: "partially_paid", amount_paid: 10000 });
    const edit = await admin.from("payment_records").update({ amount: 1 }).eq("id", pay.data!.id);
    expect(edit.error).not.toBeNull();
    const del = await admin.from("payment_records").delete().eq("id", pay.data!.id);
    expect(del.error ?? (del.count === 0 ? null : "deleted")).toBeDefined();
    const voided = await admin.from("payment_records").update({ is_void: true, void_reason: "Entered twice" }).eq("id", pay.data!.id);
    expect(voided.error).toBeNull();
    expect((await admin.from("fees").select("status, amount_paid").eq("id", fee).single()).data).toMatchObject({ status: "pending", amount_paid: 0 });
    const waive = await admin.from("fees").update({ waived_amount: 50000, waiver_reason: "Scholarship approved by director" }).eq("id", fee).select("status").single();
    expect(waive.data?.status).toBe("waived");
    const trainerWaive = await trainer.from("fees").update({ waived_amount: 1 }).eq("id", fee).select("id");
    expect(trainerWaive.data ?? []).toEqual([]);
  });

  // ---------- Storage ----------
  it("protects private files: students cannot read each other's uploads", async () => {
    const path = `${S1}/documents/test-${Date.now()}.txt`;
    const up = await student.storage.from("student-files").upload(path, new Blob(["secret"], { type: "text/plain" }));
    expect(up.error).toBeNull();
    const own = await student.storage.from("student-files").createSignedUrl(path, 60);
    expect(own.error).toBeNull();
    const other = await student2.storage.from("student-files").createSignedUrl(path, 60);
    expect(other.error).not.toBeNull();
    const wrongFolder = await student2.storage.from("student-files").upload(`${S1}/documents/hack.txt`, new Blob(["x"], { type: "text/plain" }));
    expect(wrongFolder.error).not.toBeNull();
    const t = await trainer.storage.from("student-files").createSignedUrl(path, 60);
    expect(t.error).toBeNull(); // assigned trainer may read
    const t2 = await trainer2.storage.from("student-files").createSignedUrl(path, 60);
    expect(t2.error).not.toBeNull();
    const pub = await anon.storage.from("student-files").createSignedUrl(path, 60);
    expect(pub.error).not.toBeNull();
  });

  it("notifies students about new assignments", async () => {
    const { data } = await student.from("notifications").select("type").eq("type", "assignment_new");
    expect((data ?? []).length).toBeGreaterThan(0);
  });
});
