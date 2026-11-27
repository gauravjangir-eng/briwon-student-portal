-- =====================================================================
-- DEVELOPMENT SAMPLE DATA ONLY — NEVER RUN AGAINST PRODUCTION.
-- Loaded automatically by `supabase db reset` on the LOCAL stack.
-- All people, emails and numbers below are fictional.
-- Every demo account uses the password:  Briwon@2026
-- =====================================================================

-- Sample campus location (placeholder — set the real one in Settings)
update public.academy_settings
   set campus_latitude = 26.9124, campus_longitude = 75.7873, campus_radius_m = 200,
       support_email = 'office@example.com';

-- Courses & modules -----------------------------------------------------
insert into public.courses (id, code, name, description, requirements, duration_weeks, fee_amount) values
  ('c0000000-0000-0000-0000-000000000001', 'FSWD', 'Full Stack Web Development',
   'HTML, CSS, JavaScript, React, Node.js and databases with real-world projects.', 'Basic computer skills', 24, 60000),
  ('c0000000-0000-0000-0000-000000000002', 'UIUX', 'UI/UX Design',
   'User research, wireframing, visual design and prototyping in Figma.', 'None', 16, 45000),
  ('c0000000-0000-0000-0000-000000000003', 'DA', 'Data Analytics',
   'Excel, SQL, Python and dashboards for business analytics.', 'Class 12 mathematics', 20, 50000);

insert into public.modules (course_id, title, position) values
  ('c0000000-0000-0000-0000-000000000001', 'Web Foundations: HTML & CSS', 1),
  ('c0000000-0000-0000-0000-000000000001', 'JavaScript Essentials', 2),
  ('c0000000-0000-0000-0000-000000000001', 'React & Next.js', 3),
  ('c0000000-0000-0000-0000-000000000001', 'Backend & Databases', 4),
  ('c0000000-0000-0000-0000-000000000002', 'Design Thinking & Research', 1),
  ('c0000000-0000-0000-0000-000000000002', 'Wireframes & Prototypes', 2),
  ('c0000000-0000-0000-0000-000000000003', 'Excel & Statistics', 1),
  ('c0000000-0000-0000-0000-000000000003', 'SQL for Analysis', 2);

-- Batches (one started 6 weeks ago, one starting soon) -----------------
insert into public.batches (id, course_id, code, name, start_date, end_date, schedule_days, class_start_time, class_end_time, capacity, location, status) values
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'FSWD-2026-A', 'Full Stack — Morning',
   current_date - 42, current_date + 126, '{1,3,5}', '10:00', '12:00', 25, 'Lab 1', 'active'),
  ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'UIUX-2026-A', 'UI/UX — Evening',
   current_date - 28, current_date + 84, '{2,4}', '17:00', '19:00', 20, 'Studio', 'active'),
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'DA-2026-A', 'Data Analytics — Weekend',
   current_date + 10, current_date + 150, '{6,0}', '11:00', '14:00', 30, 'Lab 2', 'planned');

-- Trainers ------------------------------------------------------------
insert into public.trainers (id, full_name, email, phone, specialization) values
  ('70000000-0000-0000-0000-000000000001', 'Ananya Mehta', 'trainer@example.com', '+91 90000 00001', 'Full Stack Development'),
  ('70000000-0000-0000-0000-000000000002', 'Rohan Verma', 'trainer2@example.com', '+91 90000 00002', 'Product Design');
insert into public.batch_trainers (batch_id, trainer_id) values
  ('b0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002');

-- Students + enrollments + fees --------------------------------------------
insert into public.students (id, full_name, email, phone, admission_date, address, emergency_contact_name, emergency_contact_phone, skills) values
  ('50000000-0000-0000-0000-000000000001', 'Aarav Sharma',  'student@example.com',  '+91 98000 00001', current_date - 45, '12 MI Road, Jaipur', 'Sunita Sharma', '+91 98000 10001', '{HTML,CSS,JavaScript,React}'),
  ('50000000-0000-0000-0000-000000000002', 'Diya Patel',    'student2@example.com', '+91 98000 00002', current_date - 44, '5 C-Scheme, Jaipur', 'Rakesh Patel', '+91 98000 10002', '{HTML,CSS}'),
  ('50000000-0000-0000-0000-000000000003', 'Kabir Singh',   'student3@example.com', '+91 98000 00003', current_date - 44, '88 Vaishali Nagar, Jaipur', 'Harpreet Singh', '+91 98000 10003', '{}'),
  ('50000000-0000-0000-0000-000000000004', 'Meera Iyer',    'student4@example.com', '+91 98000 00004', current_date - 30, '3 Malviya Nagar, Jaipur', 'Lakshmi Iyer', '+91 98000 10004', '{Figma}'),
  ('50000000-0000-0000-0000-000000000005', 'Ishaan Gupta',  'student5@example.com', '+91 98000 00005', current_date - 30, '21 Tonk Road, Jaipur', 'Vikas Gupta', '+91 98000 10005', '{}'),
  ('50000000-0000-0000-0000-000000000006', 'Sara Khan',     'student6@example.com', '+91 98000 00006', current_date - 5,  '7 Bani Park, Jaipur', 'Imran Khan', '+91 98000 10006', '{Excel}');

insert into public.enrollments (id, student_id, course_id, batch_id, enrolled_on) values
  ('e0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', current_date - 45),
  ('e0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', current_date - 44),
  ('e0000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', current_date - 44),
  ('e0000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', current_date - 30),
  ('e0000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', current_date - 30),
  ('e0000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', current_date - 5);

insert into public.fees (id, enrollment_id, student_id, total_amount, due_date) values
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 60000, current_date + 30),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 60000, current_date + 30),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', 60000, current_date - 3),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000004', 45000, current_date + 20),
  ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000005', 45000, current_date + 20),
  ('f0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000006', 50000, current_date + 40);

insert into public.payment_records (fee_id, amount, paid_on, method, reference_number) values
  ('f0000000-0000-0000-0000-000000000001', 30000, current_date - 45, 'upi', 'UPI-DEMO-1001'),
  ('f0000000-0000-0000-0000-000000000001', 30000, current_date - 10, 'bank_transfer', 'NEFT-DEMO-2001'),
  ('f0000000-0000-0000-0000-000000000002', 20000, current_date - 44, 'cash', null),
  ('f0000000-0000-0000-0000-000000000004', 45000, current_date - 30, 'upi', 'UPI-DEMO-1004'),
  ('f0000000-0000-0000-0000-000000000005', 15000, current_date - 30, 'card_pos', 'POS-DEMO-3005');

-- Auth users (local only). Created AFTER students/trainers so the
-- on_auth_user_created trigger links profile_id by email.
do $$
declare
  u record;
begin
  for u in select * from (values
    ('a0000000-0000-0000-0000-000000000001'::uuid, 'admin@example.com',    'Academy Admin', 'admin'),
    ('a0000000-0000-0000-0000-000000000011'::uuid, 'trainer@example.com',  'Ananya Mehta',  'trainer'),
    ('a0000000-0000-0000-0000-000000000012'::uuid, 'trainer2@example.com', 'Rohan Verma',   'trainer'),
    ('a0000000-0000-0000-0000-000000000021'::uuid, 'student@example.com',  'Aarav Sharma',  'student'),
    ('a0000000-0000-0000-0000-000000000022'::uuid, 'student2@example.com', 'Diya Patel',    'student'),
    ('a0000000-0000-0000-0000-000000000023'::uuid, 'student3@example.com', 'Kabir Singh',   'student'),
    ('a0000000-0000-0000-0000-000000000024'::uuid, 'student4@example.com', 'Meera Iyer',    'student'),
    ('a0000000-0000-0000-0000-000000000025'::uuid, 'student5@example.com', 'Ishaan Gupta',  'student')
  ) as t(id, email, name, role) loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
            crypt('Briwon@2026', gen_salt('bf')), now(),
            jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', u.role),
            jsonb_build_object('full_name', u.name), now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now(), now());
  end loop;
end $$;

-- Sessions: generate the schedule and mark attendance for past classes ----
do $$
declare
  v_tz text := 'Asia/Kolkata';
  b record; d date; sid uuid; st record; v_status text; i int := 0;
begin
  for b in select * from public.batches where status = 'active' loop
    for d in select generate_series(b.start_date, current_date + 21, interval '1 day')::date loop
      if extract(dow from d)::int = any (b.schedule_days) then
        insert into public.class_sessions (batch_id, trainer_id, title, starts_at, ends_at, location)
        select b.id, bt.trainer_id, b.name || ' class', (d + b.class_start_time) at time zone v_tz,
               (d + b.class_end_time) at time zone v_tz, b.location
          from public.batch_trainers bt where bt.batch_id = b.id limit 1
        returning id into sid;
        if (d + b.class_end_time) at time zone v_tz < now() then
          for st in select e.student_id from public.enrollments e where e.batch_id = b.id and e.status = 'active' loop
            i := i + 1;
            v_status := case
              when st.student_id = '50000000-0000-0000-0000-000000000001' then case when i % 9 = 0 then 'late' else 'present' end
              when st.student_id = '50000000-0000-0000-0000-000000000003' then case when i % 2 = 0 then 'absent' when i % 3 = 0 then 'late' else 'present' end
              else case when i % 6 = 0 then 'absent' when i % 5 = 0 then 'late' else 'present' end end;
            insert into public.attendance (session_id, student_id, status, source, check_in_at)
            values (sid, st.student_id, v_status, 'trainer', case when v_status <> 'absent' then (d + b.class_start_time) at time zone v_tz end);
          end loop;
        end if;
      end if;
    end loop;
  end loop;
end $$;

-- Assignments, projects and assessments for the Full Stack batch --------
insert into public.assignments (id, batch_id, course_id, title, description, instructions, assigned_on, deadline, max_marks, submission_types, created_by) values
  ('a5000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'Personal portfolio page', 'Build a responsive one-page portfolio.', 'Use semantic HTML and Flexbox. Submit a live link.', current_date - 35, now() - interval '28 days', 20, '{url,file}', 'a0000000-0000-0000-0000-000000000011'),
  ('a5000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'JavaScript to-do app', 'DOM manipulation and localStorage.', 'Add, complete and delete tasks.', current_date - 21, now() - interval '14 days', 50, '{url,file,text}', 'a0000000-0000-0000-0000-000000000011'),
  ('a5000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'React weather dashboard', 'Fetch data from a public API.', 'Handle loading and error states.', current_date - 3, now() + interval '4 days', 100, '{url,project_link}', 'a0000000-0000-0000-0000-000000000011');

insert into public.submissions (assignment_id, student_id, status, content_text, external_url, original_deadline, first_submitted_at, submitted_at, is_late, marks, feedback, reviewed_by, reviewed_at) values
  ('a5000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'approved', null, 'https://example.com/aarav-portfolio', now() - interval '28 days', now() - interval '29 days', now() - interval '29 days', false, 18, 'Clean layout and great responsiveness.', 'a0000000-0000-0000-0000-000000000011', now() - interval '26 days'),
  ('a5000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'approved', null, 'https://example.com/aarav-todo', now() - interval '14 days', now() - interval '15 days', now() - interval '15 days', false, 44, 'Well structured code.', 'a0000000-0000-0000-0000-000000000011', now() - interval '12 days'),
  ('a5000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'approved', null, 'https://example.com/aarav-weather', now() + interval '4 days', now() - interval '1 day', now() - interval '1 day', false, 90, 'Excellent error handling.', 'a0000000-0000-0000-0000-000000000011', now()),
  ('a5000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'approved', null, 'https://example.com/diya-portfolio', now() - interval '28 days', now() - interval '27 days', now() - interval '27 days', true, 14, 'Good start, improve spacing.', 'a0000000-0000-0000-0000-000000000011', now() - interval '25 days'),
  ('a5000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'submitted', 'Repo link in URL', 'https://example.com/diya-todo', now() - interval '14 days', now() - interval '14 days 2 hours', now() - interval '14 days 2 hours', false, null, null, null, null),
  ('a5000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'revision_required', null, 'https://example.com/kabir-portfolio', now() - interval '28 days', now() - interval '20 days', now() - interval '20 days', true, 6, 'Page is not responsive. Please fix the mobile layout.', 'a0000000-0000-0000-0000-000000000011', now() - interval '18 days');

insert into public.projects (id, batch_id, kind, sequence, title, instructions, deadline, max_marks, requires_presentation, created_by) values
  ('9f000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'mini', 1, 'Landing page clone', 'Recreate a landing page layout of your choice from scratch.', now() - interval '30 days', 100, false, 'a0000000-0000-0000-0000-000000000011'),
  ('9f000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'mini', 2, 'Quiz app', 'Vanilla JS quiz with scoring.', now() - interval '20 days', 100, false, 'a0000000-0000-0000-0000-000000000011'),
  ('9f000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'mini', 3, 'Expense tracker', 'React with charts.', now() - interval '10 days', 100, false, 'a0000000-0000-0000-0000-000000000011'),
  ('9f000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'mini', 4, 'REST API', 'Node.js API with CRUD endpoints.', now() - interval '2 days', 100, false, 'a0000000-0000-0000-0000-000000000011'),
  ('9f000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'capstone', 1, 'Capstone: Full stack product', 'Plan, build, deploy and present a full stack product.', now() - interval '1 day', 100, true, 'a0000000-0000-0000-0000-000000000011');

insert into public.project_submissions (project_id, student_id, project_url, status, presentation_status, marks, feedback, reviewed_by, reviewed_at) values
  ('9f000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'https://example.com/a/p1', 'approved', 'not_required', 82, 'Pixel perfect.', 'a0000000-0000-0000-0000-000000000011', now() - interval '28 days'),
  ('9f000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'https://example.com/a/p2', 'approved', 'not_required', 88, 'Great logic.', 'a0000000-0000-0000-0000-000000000011', now() - interval '18 days'),
  ('9f000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'https://example.com/a/p3', 'approved', 'not_required', 79, 'Nice charts.', 'a0000000-0000-0000-0000-000000000011', now() - interval '8 days'),
  ('9f000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000001', 'https://example.com/a/p4', 'approved', 'not_required', 85, 'Solid API design.', 'a0000000-0000-0000-0000-000000000011', now() - interval '1 day'),
  ('9f000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001', 'https://example.com/a/capstone', 'approved', 'completed', 86, 'Excellent presentation.', 'a0000000-0000-0000-0000-000000000011', now()),
  ('9f000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'https://example.com/d/p1', 'approved', 'not_required', 70, 'Good.', 'a0000000-0000-0000-0000-000000000011', now() - interval '27 days'),
  ('9f000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'https://example.com/d/p2', 'submitted', 'not_required', null, null, null, null);

insert into public.assessments (id, batch_id, title, assessment_date, max_marks, pass_pct, is_final, trainer_id) values
  ('a7000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Final assessment — Full Stack', current_date - 1, 100, 60, true, '70000000-0000-0000-0000-000000000001');
insert into public.assessment_results (assessment_id, student_id, score, feedback, graded_by) values
  ('a7000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 84, 'Strong fundamentals.', 'a0000000-0000-0000-0000-000000000011'),
  ('a7000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 58, 'Revise async JavaScript.', 'a0000000-0000-0000-0000-000000000011');

-- Internship & placement --------------------------------------------
insert into public.internships (id, student_id, title, organization, start_date, end_date, mentor_id, status, progress_pct) values
  ('17000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Frontend intern', 'Demo Labs Pvt Ltd', current_date - 14, current_date + 60, '70000000-0000-0000-0000-000000000001', 'ongoing', 25);
insert into public.internship_tasks (internship_id, title, due_date, status) values
  ('17000000-0000-0000-0000-000000000001', 'Build component library', current_date + 7, 'in_progress'),
  ('17000000-0000-0000-0000-000000000001', 'Write unit tests', current_date + 21, 'todo');
insert into public.internship_reports (internship_id, week_number, summary, hours_worked) values
  ('17000000-0000-0000-0000-000000000001', 1, 'Set up the project, learned the codebase and fixed two UI bugs.', 32),
  ('17000000-0000-0000-0000-000000000001', 2, 'Built the button and card components with Storybook stories.', 35);

insert into public.placements (student_id, company, job_role, status, applied_on, notes) values
  ('50000000-0000-0000-0000-000000000001', 'Example Tech', 'Junior Frontend Developer', 'interview_scheduled', current_date - 4, 'Referred by mentor'),
  ('50000000-0000-0000-0000-000000000002', 'Sample Systems', 'Web Developer Trainee', 'applied', current_date - 2, null);

insert into public.announcements (title, body, audience, is_pinned) values
  ('Welcome to the Briwon Academy portal', 'Check your timetable, submit assignments and track your progress here.', 'all', true);

-- Demo notifications/audit rows produced by seed triggers are attributed to nobody.
