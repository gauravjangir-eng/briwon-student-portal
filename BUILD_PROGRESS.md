# Build progress

Status as of 27 Nov 2026. Everything below was built and run **locally** (local Supabase in Docker). Nothing has been deployed, no hosted Supabase project has been created, and no paid service is in use.

## Stages

| # | Stage | Status |
| --- | --- | --- |
| 1 | Project scaffold (Next.js, TypeScript, Tailwind, lint, tests) | Done |
| 2 | Database schema, Student/Trainer/Receipt/Certificate ID generators | Done |
| 3 | Auth: login, invite, forgot/reset password, roles, route protection | Done |
| 4 | Admin: students, admissions, trainers, courses, modules, batches, transfers | Done |
| 5 | Class sessions and GPS attendance, corrections, leave | Done |
| 6 | Assignments and submissions with late policies and history | Done |
| 7 | Mini-projects, capstone, final assessment | Done |
| 8 | Fees, payments, waivers, receipts (PDF) | Done |
| 9 | Certificate eligibility (8 checks), grades, approval, PDF + QR, public verification | Done |
| 10 | Internships (tasks, reports, mentor review) and placements (interviews, offers) | Done |
| 11 | Dashboards, announcements, notifications, reports + CSV export, settings with history, audit log | Done |
| 12 | Testing | Done (see below) |
| 13 | Security review | Done (see PROJECT_NOTES.md → Security) |
| 14 | Documentation | Done |

## What is working (verified locally)

- **Roles and access.** Admin, Trainer and Student each get their own navigation and pages. Students cannot open admin or trainer pages; trainers cannot open admin or student-only pages; signed-out visitors are sent to the login page. Enforced in the database with RLS, not only in the UI.
- **Student IDs** `BRI-2026-0001` style, assigned by the database per admission year. Trainer codes `BRI-TRN-…`, receipts `BRI-RCPT-…`, certificates `BRI-CERT-…`.
- **Admissions**: admin admits a student into a course and batch (capacity and batch state are checked), and can send a portal invitation (needs the server key).
- **GPS attendance**: present for 0–14 min after start, late for 15–30, absent after; campus radius and GPS accuracy checks; one check-in per session; every attempt logged. All thresholds are editable in Settings. Trainers mark attendance for missed students but cannot overwrite an existing mark; they file a correction that an admin approves. When a trainer or admin approves a leave request, unmarked and absent sessions in those dates become "excused" (present and late marks are kept), and excused sessions are left out of the attendance percentage.
- **Assignments**: per-assignment late policy (no late submissions / accepted as on time within the grace period, default 7 days / always accepted but marked late), resubmission history, trainer review with marks and feedback.
- **Projects**: four mini-projects and a capstone with presentation status; reviews and marks.
- **Assessments**: final assessment with a configurable pass mark (default 60%).
- **Fees**: fee plans, append-only payment records (voiding requires a reason), admin-only waivers, PDF receipts, automatic status (pending / partial / paid / waived / overdue). No card or bank details are stored.
- **Certificates**: 8-condition eligibility check shown to admin, trainer and student; grade Distinction ≥85, Merit 70–84, Pass 50–69; only an admin can approve or revoke; PDF certificate with QR code; public page `/verify/<token>` shows only name, course, grade, dates and status.
- **Internships and placements**: mentor, tasks, weekly reports, placement drives with interviews and offers. Students see their own placement records without internal staff notes. Pages state that placement is not guaranteed.
- **Files**: private storage buckets only; downloads go through short-lived signed URLs after a permission check; file type and size validated on upload.
- **Enquiries (leads)**: admins record enquiries with source, course of interest and follow-up date, log calls/WhatsApp/visits/notes in an append-only timeline, mark them lost with a reason, and "Admit as student" pre-fills the admission form and marks the enquiry converted. Follow-ups due today or overdue are highlighted; CSV export included. Trainers and students cannot see enquiries.
- **Mentors** are the Trainer role (trainers mentor internships); the UI labels it "Trainer / mentor".
- **Notifications** in the app (bell icon) for new assignments, sessions, announcements, reviews, placements, attendance warnings, deadline reminders and low performance. Daily alerts are run by an admin with the "Run daily alerts" button.
- **Reports and CSV exports**: students, attendance, attendance summary, submissions, fees, payments, certificates, placements. CSV output guards against spreadsheet formula injection.
- **Settings** for every policy value, with a history of changes; **audit log** of sensitive changes.
- **Emails (local only)**: the invite and password-reset emails were checked end to end through the local Mailpit inbox (email → link → set password → sign in). No real email provider is configured, so **no real emails are sent yet**.

## Tests run

| Suite | Command | Result |
| --- | --- | --- |
| Unit tests (business rules) | `npm test` | 20 of 20 pass |
| Integration tests (database, RLS, storage) | `npm run test:integration` | 30 of 30 pass |
| TypeScript | `npm run typecheck` | Clean |
| ESLint | `npm run lint` | Clean |
| Production build | `npm run build` | Succeeds |
| Browser check (Playwright, not committed) | Logged in as admin, trainer and student; opened every page plus one detail page of each type at desktop and phone size | 122 page loads, 0 errors, no horizontal scrolling on phone |
| Access check (Playwright) | Student opening admin/trainer pages, trainer opening admin/student pages, signed-out user opening admin | All redirected |
| Email flows (Playwright + Mailpit) | Password reset and invite links | Both work |
| `npm audit --omit=dev` | | 0 vulnerabilities |

Integration tests cover: RLS isolation between students, between trainers' batches and for anonymous users; role escalation attempts; Student ID format; every attendance timing case; radius and accuracy rejection; duplicate check-ins; the correction flow; approved leave; each late policy; submission history; file-path checks; fee status and append-only payments; storage isolation between students; the certificate flow and what the public verification page reveals; notifications.

**Not yet tested:** the GPS check-in button on a real phone (the database logic is tested, the browser geolocation prompt is not), PDF output visually on paper, and anything against a hosted Supabase project or Vercel.

## Packages installed

Runtime: next 15.5, react 19.1, @supabase/ssr, @supabase/supabase-js, zod 4, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-slot, class-variance-authority, clsx, tailwind-merge, lucide-react, sonner, recharts, pdf-lib, qrcode, server-only.

Development: typescript, tailwindcss 4 + @tailwindcss/postcss, eslint + eslint-config-next, vitest, supabase (CLI), @types/*.

`package.json` overrides `postcss` to 8.5.33 to fix advisories in the copy bundled with Next.

## Migrations

| File | Contents |
| --- | --- |
| `20261127000100_core_schema.sql` | All tables, constraints, indexes, the settings row |
| `20261127000200_functions_triggers.sql` | Role helpers, ID generators, attendance/submission/fee/certificate rules, notifications, audit triggers |
| `20261127000300_rls_policies.sql` | RLS on every table and per-role policies |
| `20261127000400_storage.sql` | Private buckets `student-files`, `course-files`, `admin-files` and their policies |
| `20261127000500_leads.sql` | Admission enquiries (leads) and their activity timeline, admin-only |

`supabase/seed.sql` is local demo data only.

## Remaining before real use

See PROJECT_NOTES.md → "Going live". In short: a hosted Supabase project, a real email provider (SMTP), a Vercel project and the domain, all of which need Parth's approval because they create accounts or may cost money.
