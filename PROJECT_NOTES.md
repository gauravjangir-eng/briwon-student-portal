# Project notes

Reference for whoever maintains the Briwon Academy Student Portal. For setup see [README.md](./README.md); for what is built and tested see [BUILD_PROGRESS.md](./BUILD_PROGRESS.md).

## Architecture

- **Next.js App Router** (server components by default). Pages read data on the server with the signed-in user's Supabase session, so every query is filtered by Row Level Security.
- **Writes** go through server actions in `src/lib/actions/` (validated with zod) or directly through Postgres functions (RPCs). Rules that must never be bypassed live in the database:
  - attendance check-in and marking: `student_check_in`, `staff_mark_attendance`, `review_attendance_correction`
  - assignments and projects: `submit_assignment`, `review_submission`, `submit_project`, `review_project`
  - assessments: `record_assessment_result`
  - certificates: `certificate_eligibility`, `approve_certificate`, `revoke_certificate`, `verify_certificate`
  - admissions: `admit_student`, `enroll_student`, `transfer_student`
  - triggers for ID numbers, fee status, payment immutability, approved leave, history tables, notifications and the audit log
- **Roles** are stored on `profiles.role` (admin / trainer / student). A trigger stops anyone except an admin from changing a role. New sign-ins are linked to their student or trainer record by email.
- **Files** live in three private Storage buckets. The first folder of every path is the owner (student id or batch id), and storage policies check it. The app hands out signed URLs that expire after a short time from `/api/files`, only after checking the user may see that file.
- **Time zone**: the academy runs on India time (Asia/Kolkata, UTC+05:30). The database stores UTC; the app shows and accepts IST.

## Business rules and defaults

Every value below is editable by an admin in **Settings**, and each change is kept in the settings history.

| Rule | Default |
| --- | --- |
| Check-in opens before class | 15 min |
| Present / late / absent | 0–14 min / 15–30 min / after 30 min |
| Campus radius / max GPS accuracy | 150 m / 100 m (seed uses 200 m for the demo campus) |
| A late mark counts toward attendance as | 1.0 of a present mark |
| Late submission grace | 7 days, counted as on time when the assignment uses the "grace" policy |
| Grade weights | Assignments 30, projects 30, final assessment 40 |
| Grades | Distinction ≥ 85, Merit 70–84, Pass 50–69 |

**Certificate eligibility (all 8 must be met):**
1. Attendance at least 75%.
2. At least 80% of required assignments on time.
3. Each required assignment scores at least 50%.
4. All 4 mini-projects submitted.
5. Capstone submitted and presented.
6. Capstone score at least 50/100.
7. Final assessment at least 60%.
8. Fees cleared or officially waived.

Meeting all eight only makes a student *eligible*. An admin still approves each certificate.

Decisions I made without an answer from Parth (all changeable in Settings): the 7-day grace rule, the 30/30/40 weights, late = 1.0, the 15-minute check-in window, and payments recorded manually by an admin (there is no online payment gateway).

## Security review (Stage 13)

Checked and in place:
- RLS is enabled on every table in `public`. Anonymous users have no table access. The only thing they can call is `verify_certificate`, which returns name, course, grade, dates and status only.
- The service role key is used only in `src/lib/supabase/admin.ts`, which imports `server-only`, so it cannot end up in browser code. It is used only to send invitations.
- No secrets are in the repository: `.env*` is ignored except `.env.example`, which holds placeholders. Git history was checked for keys.
- Admins can never see passwords. Accounts are created by invitation, and users set their own password through Supabase Auth.
- No card numbers, CVV or bank credentials are stored. Payments record amount, date, method and reference only.
- Students cannot change their role, Student ID, batch, marks, attendance or fee records. Trainers cannot overwrite attendance, read fees, or see placement notes. These were tested against the database directly, not just the UI.
- Payment records are append-only (void with a reason instead of delete). Attendance and submission changes keep history. Sensitive tables write to the audit log.
- Uploads are limited to 10 MB and to a list of allowed file types, checked both in the app and in the bucket settings. File names are cleaned.
- CSV exports neutralise spreadsheet formulas (`=`, `+`, `-`, `@`).
- The login redirect only allows paths on this site (no open redirect).
- Security headers are set in `next.config.ts`: no framing, nosniff, a strict referrer policy, HSTS, and geolocation allowed only for this site. The `X-Powered-By` header is off.
- `npm audit` shows 0 vulnerabilities in production dependencies. Next's bundled `postcss` is pinned to a fixed version through `overrides`.
- Signup is disabled; only admins add people.

Recommended before real use:
- Turn on **leaked password protection** and set a password policy in the hosted Supabase Auth settings.
- Add a strict Content-Security-Policy once the final domain and any analytics are known.
- Add **rate limiting** on login and password reset. Supabase applies its own limits; consider Vercel's firewall too.
- Ask admins to use multi-factor authentication. Supabase supports it, but the portal does not ask for it yet.

## Environment variables

| Name | Where | Secret? | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | No | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | No (public, protected by RLS) | Anon or publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (server only) + `.env.local` | **Yes** | Sending invitations. Never prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SITE_URL` | Vercel + `.env.local` | No | Public URL used in emails and certificate QR codes, e.g. `https://portal.briwonacademy.com` |

Put real values in Vercel's Environment Variables screen and in your local `.env.local`. Never put them in code or commit them.

## Database migrations

Migrations are in `supabase/migrations/` and run in order. They have not been applied to any hosted project yet.

```bash
npx supabase login                       # opens the browser
npx supabase link --project-ref <ref>    # your project's reference id
npx supabase db push                     # applies the migrations
```

Do **not** run `supabase/seed.sql` on production: it creates demo accounts with a known password. After pushing, create the first admin:
1. In Supabase, go to Authentication, then Users, and invite the admin's email.
2. In the SQL editor, run `update public.profiles set role = 'admin' where email = '<their email>';`
3. Then, in the portal's Settings, set the campus location and radius.

Regenerate types after a schema change with `npm run db:types`.

## Going live (needs Parth's approval: creates accounts, may cost money)

1. **Supabase project.** Create one in the Mumbai (ap-south-1) region. The free tier is fine to start; it pauses after a week of no use, so a paid plan is likely for real use. Then:
   - Push the migrations.
   - Under Auth, then URL configuration, set the Site URL to the portal URL and add `https://<portal-domain>/auth/confirm**` as a redirect URL.
   - Under Auth, then Email Templates, paste `supabase/templates/invite.html` and `recovery.html`. They link to `/auth/confirm` with `token_hash`, which the app needs.
   - Keep signups disabled.
2. **Email provider.** Supabase's built-in email has a very low hourly limit and is meant for testing only. Configure custom SMTP (for example Resend, Postmark, Amazon SES or Brevo) under Auth, then SMTP settings, and send a test invite. Until then, do not tell students they will receive emails.
3. **Vercel.** Import the GitHub repo with the Next.js preset, add the 4 environment variables, and deploy a preview first.
4. **Domain.** Add `portal.briwonacademy.com` in Vercel, then create the CNAME record it shows at your DNS provider. Update `NEXT_PUBLIC_SITE_URL` and the Supabase Site URL to match. Certificate QR codes use this URL, so set it before issuing real certificates.
5. **Daily alerts.** Run them from the admin dashboard button for now. To automate, schedule `select public.run_daily_alerts();` with Supabase `pg_cron`.
6. **Backups.** Daily backups come with Supabase paid plans. Export important reports regularly.

## Known limits and open items

- Notifications are **in-app only**. Email notifications for assignments, fees and similar would need the SMTP provider above, plus a small sending job.
- There is no online payment gateway; admins record payments by hand.
- GPS check-in depends on the phone's location accuracy and the browser permission. Students who cannot check in can ask their trainer to mark them or file a correction.
- The Playwright browser check used in development is not committed. Adding an end-to-end suite to CI is a good next step.
- No CI workflow is set up yet. A GitHub Action running lint, typecheck, unit tests and the build would be cheap to add.
