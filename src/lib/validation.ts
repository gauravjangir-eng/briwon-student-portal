import { z } from "zod";

const phone = z.string().regex(/^[+\d][\d\s-]{6,18}$/, "Enter a valid phone number");
const optPhone = phone.optional();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");
const uuid = z.uuid("Select a value");
const money = z.coerce.number({ message: "Enter an amount" }).min(0, "Must be 0 or more").max(10_000_000, "Amount is too large");
const url = z.url("Enter a full link starting with https://").refine((v) => /^https?:\/\//i.test(v), "Link must start with http:// or https://");

export const STUDENT_STATUSES = ["active", "inactive", "graduated", "withdrawn", "suspended"] as const;

export const admissionSchema = z.object({
  full_name: z.string().min(2, "Enter the full name").max(120),
  email: z.email("Enter a valid email").transform((v) => v.toLowerCase()),
  phone,
  date_of_birth: date.optional(),
  course_id: uuid,
  batch_id: uuid,
  admission_date: date,
  address: z.string().max(500).optional(),
  emergency_contact_name: z.string().min(2, "Enter a contact name").max(120),
  emergency_contact_phone: phone,
  fee_amount: money,
  fee_due: date.optional(),
  status: z.enum(STUDENT_STATUSES).default("active"),
  send_invite: z.string().optional(),
});

export const studentUpdateSchema = z.object({
  id: uuid,
  full_name: z.string().min(2).max(120),
  email: z.email().transform((v) => v.toLowerCase()),
  phone,
  date_of_birth: date.optional(),
  address: z.string().max(500).optional(),
  emergency_contact_name: z.string().max(120).optional(),
  emergency_contact_phone: optPhone,
  status: z.enum(STUDENT_STATUSES),
});

export const studentSelfSchema = z.object({
  phone,
  address: z.string().max(500).optional(),
  emergency_contact_name: z.string().max(120).optional(),
  emergency_contact_phone: optPhone,
  skills: z.string().max(500).optional(),
  portfolio_url: url.optional(),
});

export const trainerSchema = z.object({
  id: uuid.optional(),
  full_name: z.string().min(2, "Enter the full name").max(120),
  email: z.email("Enter a valid email").transform((v) => v.toLowerCase()),
  phone: optPhone,
  specialization: z.string().max(120).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const courseSchema = z.object({
  id: uuid.optional(),
  code: z.string().regex(/^[A-Za-z0-9-]{2,20}$/, "2–20 letters, numbers or dashes").transform((v) => v.toUpperCase()),
  name: z.string().min(2).max(150),
  description: z.string().max(2000).optional(),
  requirements: z.string().max(1000).optional(),
  duration_weeks: z.coerce.number().int().min(1).max(260),
  fee_amount: money,
  status: z.enum(["active", "archived"]).default("active"),
});

export const moduleSchema = z.object({
  id: uuid.optional(),
  course_id: uuid,
  title: z.string().min(2).max(150),
  description: z.string().max(1000).optional(),
  position: z.coerce.number().int().min(1).max(200),
});

export const batchSchema = z.object({
  id: uuid.optional(),
  course_id: uuid,
  code: z.string().regex(/^[A-Za-z0-9-]{2,30}$/, "2–30 letters, numbers or dashes").transform((v) => v.toUpperCase()),
  name: z.string().min(2).max(120),
  start_date: date,
  end_date: date,
  schedule_days: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Pick at least one day"),
  class_start_time: z.string().regex(/^\d{2}:\d{2}$/),
  class_end_time: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.coerce.number().int().min(1).max(500),
  location: z.string().max(120).optional(),
  status: z.enum(["planned", "active", "completed", "cancelled"]).default("planned"),
}).refine((v) => v.end_date >= v.start_date, { message: "End date must be after start date", path: ["end_date"] })
  .refine((v) => v.class_end_time > v.class_start_time, { message: "End time must be after start time", path: ["class_end_time"] });

export const sessionSchema = z.object({
  id: uuid.optional(),
  batch_id: uuid,
  module_id: uuid.optional(),
  title: z.string().min(2).max(150),
  date,
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().max(120).optional(),
}).refine((v) => v.end_time > v.start_time, { message: "End time must be after start time", path: ["end_time"] });

export const assignmentSchema = z.object({
  id: uuid.optional(),
  batch_id: uuid,
  module_id: uuid.optional(),
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  instructions: z.string().max(10000).optional(),
  assigned_on: date,
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a deadline"),
  max_marks: z.coerce.number().positive().max(1000),
  is_required: z.string().optional().transform((v) => v === "on" || v === "true"),
  submission_types: z.array(z.enum(["text", "file", "url", "project_link"])).min(1, "Pick at least one submission type"),
  late_policy: z.enum(["none", "grace", "always"]),
  status: z.enum(["draft", "published", "archived"]).default("published"),
});

export const reviewSchema = z.object({
  id: uuid,
  decision: z.enum(["under_review", "approved", "revision_required"]),
  marks: z.coerce.number().min(0).max(1000).optional(),
  feedback: z.string().max(5000).optional(),
});

export const projectSchema = z.object({
  id: uuid.optional(),
  batch_id: uuid,
  kind: z.enum(["mini", "capstone"]),
  sequence: z.coerce.number().int().min(1).max(20),
  title: z.string().min(3).max(200),
  instructions: z.string().max(10000).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a deadline"),
  max_marks: z.coerce.number().positive().max(1000),
  requires_presentation: z.string().optional().transform((v) => v === "on" || v === "true"),
});

export const assessmentSchema = z.object({
  id: uuid.optional(),
  batch_id: uuid,
  title: z.string().min(3).max(200),
  assessment_date: date,
  max_marks: z.coerce.number().positive().max(1000),
  pass_pct: z.coerce.number().min(0).max(100),
  is_final: z.string().optional().transform((v) => v === "on" || v === "true"),
});

export const paymentSchema = z.object({
  fee_id: uuid,
  amount: z.coerce.number().positive("Enter an amount above 0").max(10_000_000),
  paid_on: date,
  method: z.enum(["cash", "upi", "bank_transfer", "card_pos", "cheque", "other"]),
  reference_number: z.string().max(80).regex(/^[A-Za-z0-9\-/ ]*$/, "Letters, numbers, dashes and slashes only").optional(),
  notes: z.string().max(500).optional(),
});

export const internshipSchema = z.object({
  id: uuid.optional(),
  student_id: uuid,
  title: z.string().min(2).max(150),
  organization: z.string().max(150).optional(),
  start_date: date,
  end_date: date.optional(),
  mentor_id: uuid.optional(),
  status: z.enum(["planned", "ongoing", "completed", "terminated"]).default("planned"),
});

export const PLACEMENT_STATUSES = ["preparing", "applied", "interview_scheduled", "interviewing", "selected", "offer_received", "rejected", "joined", "not_placed"] as const;

export const placementSchema = z.object({
  id: uuid.optional(),
  student_id: uuid,
  company: z.string().min(2).max(150),
  job_role: z.string().min(2).max(150),
  status: z.enum(PLACEMENT_STATUSES),
  applied_on: date.optional(),
  offer_details: z.string().max(2000).optional(),
  outcome: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const announcementSchema = z.object({
  title: z.string().min(3).max(150),
  body: z.string().min(3).max(5000),
  audience: z.enum(["all", "students", "trainers", "batch"]),
  batch_id: uuid.optional(),
  is_pinned: z.string().optional().transform((v) => v === "on"),
  expires_at: date.optional(),
}).refine((v) => v.audience !== "batch" || v.batch_id, { message: "Choose a batch", path: ["batch_id"] });

export const settingsSchema = z.object({
  academy_name: z.string().min(2).max(120),
  support_email: z.email().optional(),
  campus_latitude: z.coerce.number().min(-90).max(90).optional(),
  campus_longitude: z.coerce.number().min(-180).max(180).optional(),
  campus_radius_m: z.coerce.number().int().min(10).max(5000),
  max_gps_accuracy_m: z.coerce.number().int().min(5).max(5000),
  checkin_opens_before_min: z.coerce.number().int().min(0).max(240),
  present_until_min: z.coerce.number().int().min(0).max(240),
  late_until_min: z.coerce.number().int().min(1).max(480),
  late_attendance_weight: z.coerce.number().min(0).max(1),
  min_attendance_pct: z.coerce.number().min(0).max(100),
  min_on_time_assignments_pct: z.coerce.number().min(0).max(100),
  min_assignment_score_pct: z.coerce.number().min(0).max(100),
  late_submission_grace_days: z.coerce.number().int().min(0).max(60),
  late_within_grace_counts: z.string().optional().transform((v) => v === "on"),
  required_mini_projects: z.coerce.number().int().min(0).max(20),
  min_capstone_score_pct: z.coerce.number().min(0).max(100),
  min_final_assessment_pct: z.coerce.number().min(0).max(100),
  weight_assignments: z.coerce.number().min(0).max(100),
  weight_projects: z.coerce.number().min(0).max(100),
  weight_final_assessment: z.coerce.number().min(0).max(100),
  grade_distinction_pct: z.coerce.number().min(0).max(100),
  grade_merit_pct: z.coerce.number().min(0).max(100),
  grade_pass_pct: z.coerce.number().min(0).max(100),
  certificate_signatory_name: z.string().min(2).max(120),
  certificate_signatory_title: z.string().min(2).max(120),
}).refine((v) => v.late_until_min > v.present_until_min, { message: "Must be greater than the 'present' window", path: ["late_until_min"] })
  .refine((v) => v.weight_assignments + v.weight_projects + v.weight_final_assessment === 100, { message: "Weights must add up to 100", path: ["weight_final_assessment"] })
  .refine((v) => v.grade_distinction_pct > v.grade_merit_pct && v.grade_merit_pct > v.grade_pass_pct, { message: "Distinction > Merit > Pass", path: ["grade_pass_pct"] });

// ---- Files ----
export const FILE_RULES = {
  maxBytes: 10 * 1024 * 1024,
  types: {
    "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/zip": "zip",
    "application/x-zip-compressed": "zip", "text/plain": "txt", "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-powerpoint": "ppt", "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  } as Record<string, string>,
};

export function validateFile(file: File | null | undefined, allowed?: string[]): string | null {
  if (!file || file.size === 0) return null;
  if (file.size > FILE_RULES.maxBytes) return "File is larger than 10 MB";
  const ext = FILE_RULES.types[file.type];
  if (!ext || (allowed && !allowed.includes(ext))) return `This file type is not allowed${allowed ? ` (use ${allowed.join(", ")})` : ""}`;
  return null;
}

export function safeFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 60) || "file";
  return base;
}

export const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters").regex(/[A-Za-z]/, "Include a letter").regex(/\d/, "Include a number"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

