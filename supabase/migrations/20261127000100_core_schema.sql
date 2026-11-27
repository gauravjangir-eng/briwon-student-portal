-- =====================================================================
-- Briwon Academy Portal — 0001 Core schema
-- Tables, constraints and indexes. Functions/triggers live in 0002,
-- Row Level Security in 0003, storage in 0004.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Server-side counters for human-readable codes (BRI-2026-0001 etc).
-- Row-level locking in next_code() makes generation transaction safe.
create table public.id_counters (
  scope       text    not null,
  year        int     not null,
  last_value  int     not null default 0,
  primary key (scope, year)
);

-- ---------------------------------------------------------------------
-- Academy policy settings (single row, id = 1) + history
-- ---------------------------------------------------------------------
create table public.academy_settings (
  id                              int primary key default 1 check (id = 1),
  academy_name                    text not null default 'Briwon Academy',
  support_email                   text,
  timezone                        text not null default 'Asia/Kolkata',
  -- GPS check-in
  campus_latitude                 double precision,
  campus_longitude                double precision,
  campus_radius_m                 int not null default 150 check (campus_radius_m between 10 and 5000),
  max_gps_accuracy_m              int not null default 100 check (max_gps_accuracy_m between 5 and 5000),
  -- Attendance timing (minutes after class start)
  checkin_opens_before_min        int not null default 15 check (checkin_opens_before_min between 0 and 240),
  present_until_min               int not null default 14 check (present_until_min >= 0),
  late_until_min                  int not null default 30,
  late_attendance_weight          numeric(3,2) not null default 1.00 check (late_attendance_weight between 0 and 1),
  -- Eligibility thresholds (percentages)
  min_attendance_pct              numeric(5,2) not null default 75,
  min_on_time_assignments_pct     numeric(5,2) not null default 80,
  min_assignment_score_pct        numeric(5,2) not null default 50,
  late_submission_grace_days      int not null default 7 check (late_submission_grace_days between 0 and 60),
  late_within_grace_counts        boolean not null default true,
  required_mini_projects          int not null default 4 check (required_mini_projects between 0 and 20),
  min_capstone_score_pct          numeric(5,2) not null default 50,
  min_final_assessment_pct        numeric(5,2) not null default 60,
  -- Overall grade weighting (must sum to 100)
  weight_assignments              numeric(5,2) not null default 30,
  weight_projects                 numeric(5,2) not null default 30,
  weight_final_assessment         numeric(5,2) not null default 40,
  grade_distinction_pct           numeric(5,2) not null default 85,
  grade_merit_pct                 numeric(5,2) not null default 70,
  grade_pass_pct                  numeric(5,2) not null default 50,
  -- Certificates
  certificate_signatory_name      text not null default 'Director, Briwon Academy',
  certificate_signatory_title     text not null default 'Authorized Signatory',
  updated_at                      timestamptz not null default now(),
  updated_by                      uuid,
  constraint late_after_present check (late_until_min > present_until_min),
  constraint weights_sum_100 check (weight_assignments + weight_projects + weight_final_assessment = 100),
  constraint grade_order check (grade_distinction_pct > grade_merit_pct and grade_merit_pct > grade_pass_pct)
);

create table public.academy_settings_history (
  id          bigint generated always as identity primary key,
  settings    jsonb not null,
  changed_by  uuid,
  changed_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'student' check (role in ('admin', 'trainer', 'student')),
  full_name   text not null default '',
  email       text not null,
  phone       text,
  avatar_path text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

create table public.trainers (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid unique references public.profiles (id) on delete set null,
  trainer_code    text unique,
  full_name       text not null check (length(trim(full_name)) between 2 and 120),
  email           text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone           text,
  specialization  text,
  status          text not null default 'active' check (status in ('active', 'inactive')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.students (
  id                        uuid primary key default gen_random_uuid(),
  profile_id                uuid unique references public.profiles (id) on delete set null,
  student_code              text unique,         -- BRI-2026-0001, set by trigger
  full_name                 text not null check (length(trim(full_name)) between 2 and 120),
  email                     text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone                     text not null,
  date_of_birth             date,
  address                   text,
  emergency_contact_name    text,
  emergency_contact_phone   text,
  admission_date            date not null default current_date,
  status                    text not null default 'active'
                            check (status in ('active', 'inactive', 'graduated', 'withdrawn', 'suspended')),
  photo_path                text,
  skills                    text[] not null default '{}',
  portfolio_url             text,
  resume_path               text,
  invited_at                timestamptz,
  archived_at               timestamptz,
  created_by                uuid references public.profiles (id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index students_status_idx on public.students (status) where archived_at is null;
create index students_name_idx on public.students (lower(full_name));

-- ---------------------------------------------------------------------
-- Courses, modules, batches, enrollment
-- ---------------------------------------------------------------------
create table public.courses (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique check (code ~ '^[A-Z0-9-]{2,20}$'),
  name            text not null check (length(trim(name)) between 2 and 150),
  description     text,
  requirements    text,
  duration_weeks  int not null check (duration_weeks between 1 and 260),
  fee_amount      numeric(12,2) not null default 0 check (fee_amount >= 0),
  status          text not null default 'active' check (status in ('active', 'archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.modules (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses (id) on delete cascade,
  title        text not null,
  description  text,
  position     int not null check (position > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (course_id, position) deferrable initially deferred
);

create table public.batches (
  id                 uuid primary key default gen_random_uuid(),
  course_id          uuid not null references public.courses (id),
  code               text not null unique,
  name               text not null,
  start_date         date not null,
  end_date           date not null,
  schedule_days      int[] not null default '{1,2,3,4,5}',   -- 0 = Sunday … 6 = Saturday
  class_start_time   time not null default '10:00',
  class_end_time     time not null default '12:00',
  capacity           int not null default 30 check (capacity between 1 and 500),
  location           text,
  status             text not null default 'planned' check (status in ('planned', 'active', 'completed', 'cancelled')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (end_date >= start_date),
  check (class_end_time > class_start_time)
);
create index batches_course_idx on public.batches (course_id);

create table public.batch_trainers (
  batch_id     uuid not null references public.batches (id) on delete cascade,
  trainer_id   uuid not null references public.trainers (id) on delete cascade,
  is_primary   boolean not null default true,
  assigned_at  timestamptz not null default now(),
  primary key (batch_id, trainer_id)
);
create index batch_trainers_trainer_idx on public.batch_trainers (trainer_id);

create table public.enrollments (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.students (id),
  course_id         uuid not null references public.courses (id),
  batch_id          uuid not null references public.batches (id),
  status            text not null default 'active' check (status in ('active', 'transferred', 'completed', 'withdrawn')),
  enrolled_on       date not null default current_date,
  ended_on          date,
  transferred_from  uuid references public.enrollments (id),
  notes             text,
  created_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- A student can have only one *active* enrollment per course.
create unique index enrollments_one_active_per_course on public.enrollments (student_id, course_id) where status = 'active';
create index enrollments_batch_idx on public.enrollments (batch_id) where status = 'active';
create index enrollments_student_idx on public.enrollments (student_id);

-- ---------------------------------------------------------------------
-- Sessions & attendance
-- (named class_sessions to avoid confusion with auth.sessions)
-- ---------------------------------------------------------------------
create table public.class_sessions (
  id          uuid primary key default gen_random_uuid(),
  batch_id    uuid not null references public.batches (id) on delete cascade,
  module_id   uuid references public.modules (id) on delete set null,
  trainer_id  uuid references public.trainers (id) on delete set null,
  title       text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  location    text,
  status      text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index class_sessions_batch_time_idx on public.class_sessions (batch_id, starts_at);

create table public.attendance (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.class_sessions (id) on delete cascade,
  student_id      uuid not null references public.students (id),
  status          text not null check (status in ('present', 'late', 'absent', 'excused')),
  source          text not null check (source in ('check_in', 'trainer', 'correction')),
  check_in_at     timestamptz,
  latitude        double precision,
  longitude       double precision,
  accuracy_m      double precision,
  distance_m      double precision,
  marked_by       uuid references public.profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (session_id, student_id)               -- no duplicate attendance per session
);
create index attendance_student_idx on public.attendance (student_id);

create table public.attendance_history (
  id             bigint generated always as identity primary key,
  attendance_id  uuid not null references public.attendance (id) on delete cascade,
  old_status     text,
  new_status     text not null,
  changed_by     uuid,
  reason         text,
  changed_at     timestamptz not null default now()
);

create table public.check_in_attempts (
  id            bigint generated always as identity primary key,
  session_id    uuid not null references public.class_sessions (id) on delete cascade,
  student_id    uuid not null references public.students (id),
  result        text not null,
  distance_m    double precision,
  accuracy_m    double precision,
  attempted_at  timestamptz not null default now()
);
create index check_in_attempts_lookup on public.check_in_attempts (student_id, session_id, attempted_at);

create table public.attendance_correction_requests (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.class_sessions (id) on delete cascade,
  student_id        uuid not null references public.students (id),
  requested_status  text not null check (requested_status in ('present', 'late', 'absent', 'excused')),
  reason            text not null check (length(trim(reason)) >= 5),
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by      uuid not null references public.profiles (id),
  reviewed_by       uuid references public.profiles (id),
  reviewed_at       timestamptz,
  review_note       text,
  created_at        timestamptz not null default now()
);
create unique index correction_one_pending on public.attendance_correction_requests (session_id, student_id) where status = 'pending';

create table public.leave_requests (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students (id),
  start_date   date not null,
  end_date     date not null,
  reason       text not null check (length(trim(reason)) >= 5),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by  uuid references public.profiles (id),
  reviewed_at  timestamptz,
  review_note  text,
  created_at   timestamptz not null default now(),
  check (end_date >= start_date)
);

-- ---------------------------------------------------------------------
-- Assignments & submissions
-- ---------------------------------------------------------------------
create table public.assignments (
  id                uuid primary key default gen_random_uuid(),
  batch_id          uuid not null references public.batches (id) on delete cascade,
  course_id         uuid not null references public.courses (id),
  module_id         uuid references public.modules (id) on delete set null,
  title             text not null check (length(trim(title)) between 3 and 200),
  description       text,
  instructions      text,
  assigned_on       date not null default current_date,
  deadline          timestamptz not null,
  max_marks         numeric(6,2) not null default 100 check (max_marks > 0),
  is_required       boolean not null default true,
  submission_types  text[] not null default '{text,file,url}'
                    check (submission_types <@ array['text','file','url','project_link']::text[] and cardinality(submission_types) > 0),
  late_policy       text not null default 'grace' check (late_policy in ('none', 'grace', 'always')),
  attachment_paths  text[] not null default '{}',
  status            text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index assignments_batch_idx on public.assignments (batch_id, deadline);

create table public.submissions (
  id                 uuid primary key default gen_random_uuid(),
  assignment_id      uuid not null references public.assignments (id) on delete cascade,
  student_id         uuid not null references public.students (id),
  status             text not null default 'submitted'
                     check (status in ('assigned', 'submitted', 'under_review', 'approved', 'revision_required', 'late')),
  content_text       text,
  file_path          text,
  external_url       text,
  original_deadline  timestamptz not null,
  first_submitted_at timestamptz,
  submitted_at       timestamptz,
  is_late            boolean not null default false,
  attempt            int not null default 1,
  marks              numeric(6,2),
  feedback           text,
  reviewed_by        uuid references public.profiles (id),
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (assignment_id, student_id)
);
create index submissions_student_idx on public.submissions (student_id);

create table public.submission_history (
  id             bigint generated always as identity primary key,
  submission_id  uuid not null references public.submissions (id) on delete cascade,
  attempt        int not null,
  status         text not null,
  content_text   text,
  file_path      text,
  external_url   text,
  submitted_at   timestamptz,
  is_late        boolean,
  marks          numeric(6,2),
  feedback       text,
  reviewed_by    uuid,
  reviewed_at    timestamptz,
  recorded_at    timestamptz not null default now()
);
create index submission_history_sub_idx on public.submission_history (submission_id);

-- ---------------------------------------------------------------------
-- Projects & assessments
-- ---------------------------------------------------------------------
create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references public.batches (id) on delete cascade,
  kind          text not null check (kind in ('mini', 'capstone')),
  sequence      int not null default 1,
  title         text not null,
  instructions  text,
  deadline      timestamptz not null,
  max_marks     numeric(6,2) not null default 100 check (max_marks > 0),
  requires_presentation boolean not null default false,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (batch_id, kind, sequence)
);

create table public.project_submissions (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references public.projects (id) on delete cascade,
  student_id           uuid not null references public.students (id),
  file_path            text,
  project_url          text,
  notes                text,
  submitted_at         timestamptz not null default now(),
  status               text not null default 'submitted'
                       check (status in ('submitted', 'under_review', 'approved', 'revision_required')),
  presentation_status  text not null default 'not_required'
                       check (presentation_status in ('not_required', 'pending', 'scheduled', 'completed')),
  presentation_at      timestamptz,
  marks                numeric(6,2),
  feedback             text,
  reviewed_by          uuid references public.profiles (id),
  reviewed_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (project_id, student_id)
);

create table public.assessments (
  id               uuid primary key default gen_random_uuid(),
  batch_id         uuid not null references public.batches (id) on delete cascade,
  title            text not null,
  assessment_date  date not null,
  max_marks        numeric(6,2) not null check (max_marks > 0),
  pass_pct         numeric(5,2) not null default 60 check (pass_pct between 0 and 100),
  is_final         boolean not null default true,
  trainer_id       uuid references public.trainers (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.assessment_results (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references public.assessments (id) on delete cascade,
  student_id     uuid not null references public.students (id),
  score          numeric(6,2) not null check (score >= 0),
  feedback       text,
  graded_by      uuid references public.profiles (id),
  graded_at      timestamptz not null default now(),
  unique (assessment_id, student_id)
);

-- ---------------------------------------------------------------------
-- Fees (no card / bank credentials are ever stored)
-- ---------------------------------------------------------------------
create table public.fees (
  id                     uuid primary key default gen_random_uuid(),
  enrollment_id          uuid not null unique references public.enrollments (id),
  student_id             uuid not null references public.students (id),
  total_amount           numeric(12,2) not null check (total_amount >= 0),
  amount_paid            numeric(12,2) not null default 0,     -- maintained by trigger
  waived_amount          numeric(12,2) not null default 0 check (waived_amount >= 0),
  waiver_reason          text,
  waiver_document_path   text,
  waived_by              uuid references public.profiles (id),
  waived_at              timestamptz,
  due_date               date,
  status                 text not null default 'pending'
                         check (status in ('paid', 'partially_paid', 'pending', 'overdue', 'waived')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (waived_amount <= total_amount),
  check (waived_amount = 0 or (waiver_reason is not null and length(trim(waiver_reason)) >= 5))
);
create index fees_student_idx on public.fees (student_id);

create table public.payment_records (
  id                uuid primary key default gen_random_uuid(),
  fee_id            uuid not null references public.fees (id),
  amount            numeric(12,2) not null check (amount > 0),
  paid_on           date not null default current_date,
  method            text not null check (method in ('cash', 'upi', 'bank_transfer', 'card_pos', 'cheque', 'other')),
  reference_number  text,
  receipt_number    text unique,     -- set by trigger
  notes             text,
  is_void           boolean not null default false,
  void_reason       text,
  recorded_by       uuid references public.profiles (id),
  created_at        timestamptz not null default now()
);
create index payment_records_fee_idx on public.payment_records (fee_id);

-- ---------------------------------------------------------------------
-- Certificates
-- ---------------------------------------------------------------------
create table public.certificates (
  id                    uuid primary key default gen_random_uuid(),
  enrollment_id         uuid not null unique references public.enrollments (id),
  student_id            uuid not null references public.students (id),
  course_id             uuid not null references public.courses (id),
  certificate_number    text unique,              -- BRI-CERT-2026-0001, set on approval
  verification_token    uuid not null unique default gen_random_uuid(),
  status                text not null default 'pending_approval' check (status in ('pending_approval', 'approved', 'revoked')),
  completion_date       date,
  overall_pct           numeric(5,2),
  grade                 text check (grade in ('Distinction', 'Merit', 'Pass')),
  eligibility_snapshot  jsonb not null default '{}',
  signatory_name        text,
  signatory_title       text,
  requested_by          uuid references public.profiles (id),
  approved_by           uuid references public.profiles (id),
  approved_at           timestamptz,
  revoked_reason        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Internships & placements
-- ---------------------------------------------------------------------
create table public.internships (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.students (id),
  title              text not null,
  organization       text,
  start_date         date not null,
  end_date           date,
  mentor_id          uuid references public.trainers (id),
  status             text not null default 'planned' check (status in ('planned', 'ongoing', 'completed', 'terminated')),
  progress_pct       int not null default 0 check (progress_pct between 0 and 100),
  feedback           text,
  completion_status  text not null default 'in_progress' check (completion_status in ('in_progress', 'approved', 'not_approved')),
  approved_by        uuid references public.profiles (id),
  approved_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create table public.internship_tasks (
  id             uuid primary key default gen_random_uuid(),
  internship_id  uuid not null references public.internships (id) on delete cascade,
  title          text not null,
  description    text,
  due_date       date,
  status         text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  created_at     timestamptz not null default now()
);

create table public.internship_reports (
  id              uuid primary key default gen_random_uuid(),
  internship_id   uuid not null references public.internships (id) on delete cascade,
  week_number     int not null check (week_number between 1 and 104),
  summary         text not null check (length(trim(summary)) >= 10),
  hours_worked    numeric(5,1) check (hours_worked between 0 and 168),
  file_path       text,
  status          text not null default 'submitted' check (status in ('submitted', 'approved', 'revision_required')),
  mentor_comment  text,
  reviewed_by     uuid references public.profiles (id),
  reviewed_at     timestamptz,
  submitted_at    timestamptz not null default now(),
  unique (internship_id, week_number)
);

create table public.placements (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students (id),
  company         text not null,
  job_role        text not null,
  status          text not null default 'preparing' check (status in
                  ('preparing', 'applied', 'interview_scheduled', 'interviewing', 'selected',
                   'offer_received', 'rejected', 'joined', 'not_placed')),
  applied_on      date,
  offer_details   text,              -- restricted: admin + student only
  outcome         text,
  notes           text,              -- staff-only notes
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.placement_interviews (
  id            uuid primary key default gen_random_uuid(),
  placement_id  uuid not null references public.placements (id) on delete cascade,
  round_number  int not null default 1,
  round_name    text not null,
  scheduled_at  timestamptz,
  status        text not null default 'scheduled' check (status in ('scheduled', 'completed', 'passed', 'failed', 'cancelled')),
  feedback      text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Documents, announcements, notifications, audit
-- ---------------------------------------------------------------------
create table public.student_documents (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students (id),
  doc_type     text not null check (doc_type in ('id_proof', 'address_proof', 'photo', 'education', 'admission_form', 'other')),
  file_path    text not null,
  file_name    text not null,
  mime_type    text not null,
  size_bytes   int not null check (size_bytes > 0 and size_bytes <= 10485760),
  verified     boolean not null default false,
  uploaded_by  uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);

create table public.announcements (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text not null,
  audience      text not null default 'all' check (audience in ('all', 'students', 'trainers', 'batch')),
  batch_id      uuid references public.batches (id) on delete cascade,
  is_pinned     boolean not null default false,
  published_at  timestamptz not null default now(),
  expires_at    timestamptz,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  check (audience <> 'batch' or batch_id is not null)
);

create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  type          text not null,
  title         text not null,
  body          text,
  link          text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,
  entity      text not null,
  entity_id   text,
  details     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','trainers','students','courses','modules','batches','enrollments',
    'class_sessions','attendance','assignments','submissions','projects','project_submissions',
    'assessments','fees','certificates','internships','placements']
  loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

insert into public.academy_settings (id) values (1);
