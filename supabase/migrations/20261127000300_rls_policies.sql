-- =====================================================================
-- Briwon Academy Portal — 0003 Row Level Security
-- Every table has RLS enabled. Sensitive writes (attendance, submissions,
-- reviews, certificates) go through SECURITY DEFINER functions in 0002,
-- so those tables have no direct write policies at all.
-- =====================================================================

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Internal tables: no policies => no API access
-- (id_counters, check_in_attempts write path is via function only)

-- profiles ------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- academy settings ----------------------------------------------------
create policy settings_select on public.academy_settings for select to authenticated using (true);
create policy settings_update on public.academy_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy settings_history_select on public.academy_settings_history for select to authenticated
  using (public.is_admin());

-- trainers ------------------------------------------------------------
create policy trainers_select on public.trainers for select to authenticated using (
  public.is_admin() or profile_id = auth.uid()
  or exists (select 1 from public.batch_trainers bt join public.enrollments e on e.batch_id = bt.batch_id
             where bt.trainer_id = trainers.id and e.student_id = public.my_student_id()));
create policy trainers_admin_insert on public.trainers for insert to authenticated with check (public.is_admin());
create policy trainers_admin_update on public.trainers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- students ------------------------------------------------------------
create policy students_select on public.students for select to authenticated using (
  public.is_admin() or profile_id = auth.uid() or public.trainer_teaches_student(id));
create policy students_admin_insert on public.students for insert to authenticated with check (public.is_admin());
create policy students_update on public.students for update to authenticated
  using (public.is_admin() or profile_id = auth.uid())
  with check (public.is_admin() or profile_id = auth.uid());   -- column limits enforced by students_guard

-- catalogue: courses / modules / batches / batch_trainers ---------------
create policy courses_select on public.courses for select to authenticated using (true);
create policy courses_write on public.courses for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy modules_select on public.modules for select to authenticated using (true);
create policy modules_write on public.modules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy batches_select on public.batches for select to authenticated using (true);
create policy batches_write on public.batches for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy batch_trainers_select on public.batch_trainers for select to authenticated using (true);
create policy batch_trainers_write on public.batch_trainers for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- enrollments ---------------------------------------------------------
create policy enrollments_select on public.enrollments for select to authenticated using (
  public.is_admin() or student_id = public.my_student_id() or public.trainer_teaches_batch(batch_id));
create policy enrollments_admin_write on public.enrollments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- class sessions ------------------------------------------------------
create policy sessions_select on public.class_sessions for select to authenticated using (
  public.can_manage_batch(batch_id) or public.student_in_batch(public.my_student_id(), batch_id));
create policy sessions_insert on public.class_sessions for insert to authenticated with check (public.can_manage_batch(batch_id));
create policy sessions_update on public.class_sessions for update to authenticated
  using (public.can_manage_batch(batch_id)) with check (public.can_manage_batch(batch_id));
create policy sessions_delete on public.class_sessions for delete to authenticated using (public.is_admin());

-- attendance (writes via functions only) -------------------------------
create policy attendance_select on public.attendance for select to authenticated using (
  student_id = public.my_student_id() or public.is_admin()
  or exists (select 1 from public.class_sessions cs where cs.id = session_id and public.trainer_teaches_batch(cs.batch_id)));
create policy attendance_history_select on public.attendance_history for select to authenticated using (
  exists (select 1 from public.attendance a join public.class_sessions cs on cs.id = a.session_id
          where a.id = attendance_id and (a.student_id = public.my_student_id() or public.can_manage_batch(cs.batch_id))));
create policy check_in_attempts_select on public.check_in_attempts for select to authenticated using (
  public.is_admin() or student_id = public.my_student_id());

create policy corrections_select on public.attendance_correction_requests for select to authenticated using (
  public.is_admin() or student_id = public.my_student_id()
  or exists (select 1 from public.class_sessions cs where cs.id = session_id and public.trainer_teaches_batch(cs.batch_id)));
create policy corrections_insert on public.attendance_correction_requests for insert to authenticated with check (
  status = 'pending' and requested_by = auth.uid() and reviewed_by is null and (
    (student_id = public.my_student_id()
      and exists (select 1 from public.class_sessions cs where cs.id = session_id and public.student_in_batch(student_id, cs.batch_id)))
    or exists (select 1 from public.class_sessions cs where cs.id = session_id and public.can_manage_batch(cs.batch_id)
               and public.student_in_batch(student_id, cs.batch_id))));

-- leave requests ------------------------------------------------------
create policy leave_select on public.leave_requests for select to authenticated using (
  public.is_admin() or student_id = public.my_student_id() or public.trainer_teaches_student(student_id));
create policy leave_insert on public.leave_requests for insert to authenticated with check (
  student_id = public.my_student_id() and status = 'pending' and reviewed_by is null);
create policy leave_review on public.leave_requests for update to authenticated
  using (public.is_admin() or public.trainer_teaches_student(student_id))
  with check (public.is_admin() or public.trainer_teaches_student(student_id));

-- assignments / submissions --------------------------------------------
create policy assignments_select on public.assignments for select to authenticated using (
  public.can_manage_batch(batch_id) or (status = 'published' and public.student_in_batch(public.my_student_id(), batch_id)));
create policy assignments_insert on public.assignments for insert to authenticated with check (public.can_manage_batch(batch_id));
create policy assignments_update on public.assignments for update to authenticated
  using (public.can_manage_batch(batch_id)) with check (public.can_manage_batch(batch_id));
create policy assignments_delete on public.assignments for delete to authenticated using (public.is_admin());

create policy submissions_select on public.submissions for select to authenticated using (
  student_id = public.my_student_id()
  or exists (select 1 from public.assignments a where a.id = assignment_id and public.can_manage_batch(a.batch_id)));
create policy submission_history_select on public.submission_history for select to authenticated using (
  exists (select 1 from public.submissions s join public.assignments a on a.id = s.assignment_id
          where s.id = submission_id and (s.student_id = public.my_student_id() or public.can_manage_batch(a.batch_id))));

-- projects -------------------------------------------------------------
create policy projects_select on public.projects for select to authenticated using (
  public.can_manage_batch(batch_id) or public.student_in_batch(public.my_student_id(), batch_id));
create policy projects_insert on public.projects for insert to authenticated with check (public.can_manage_batch(batch_id));
create policy projects_update on public.projects for update to authenticated
  using (public.can_manage_batch(batch_id)) with check (public.can_manage_batch(batch_id));
create policy projects_delete on public.projects for delete to authenticated using (public.is_admin());
create policy project_submissions_select on public.project_submissions for select to authenticated using (
  student_id = public.my_student_id()
  or exists (select 1 from public.projects p where p.id = project_id and public.can_manage_batch(p.batch_id)));

-- assessments ---------------------------------------------------------
create policy assessments_select on public.assessments for select to authenticated using (
  public.can_manage_batch(batch_id) or public.student_in_batch(public.my_student_id(), batch_id));
create policy assessments_insert on public.assessments for insert to authenticated with check (public.can_manage_batch(batch_id));
create policy assessments_update on public.assessments for update to authenticated
  using (public.can_manage_batch(batch_id)) with check (public.can_manage_batch(batch_id));
create policy assessments_delete on public.assessments for delete to authenticated using (public.is_admin());
create policy assessment_results_select on public.assessment_results for select to authenticated using (
  student_id = public.my_student_id()
  or exists (select 1 from public.assessments a where a.id = assessment_id and public.can_manage_batch(a.batch_id)));

-- fees (admin + the student only; trainers have no access) --------------
create policy fees_select on public.fees for select to authenticated using (
  public.is_admin() or student_id = public.my_student_id());
create policy fees_admin_write on public.fees for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy payments_select on public.payment_records for select to authenticated using (
  public.is_admin() or exists (select 1 from public.fees f where f.id = fee_id and f.student_id = public.my_student_id()));
create policy payments_admin_insert on public.payment_records for insert to authenticated
  with check (public.is_admin() and recorded_by = auth.uid() and not is_void);
create policy payments_admin_void on public.payment_records for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- certificates (issued via approve_certificate only) -------------------
create policy certificates_select on public.certificates for select to authenticated using (
  public.is_admin() or student_id = public.my_student_id() or public.trainer_teaches_student(student_id));

-- internships ---------------------------------------------------------
create or replace function public.can_view_internship(p_internship uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.internships i where i.id = p_internship and (
    public.is_admin() or i.student_id = public.my_student_id() or i.mentor_id = public.my_trainer_id()));
$$;
create or replace function public.can_mentor_internship(p_internship uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.internships i where i.id = p_internship and (
    public.is_admin() or i.mentor_id = public.my_trainer_id()));
$$;

create policy internships_select on public.internships for select to authenticated using (
  public.is_admin() or student_id = public.my_student_id() or mentor_id = public.my_trainer_id());
create policy internships_admin_insert on public.internships for insert to authenticated with check (public.is_admin());
create policy internships_update on public.internships for update to authenticated
  using (public.is_admin() or mentor_id = public.my_trainer_id())
  with check (public.is_admin() or mentor_id = public.my_trainer_id());

create policy internship_tasks_select on public.internship_tasks for select to authenticated using (public.can_view_internship(internship_id));
create policy internship_tasks_write on public.internship_tasks for all to authenticated
  using (public.can_mentor_internship(internship_id)) with check (public.can_mentor_internship(internship_id));

create policy internship_reports_select on public.internship_reports for select to authenticated using (public.can_view_internship(internship_id));
create policy internship_reports_insert on public.internship_reports for insert to authenticated with check (
  exists (select 1 from public.internships i where i.id = internship_id and i.student_id = public.my_student_id()));
create policy internship_reports_update on public.internship_reports for update to authenticated
  using (public.can_view_internship(internship_id)) with check (public.can_view_internship(internship_id));

-- placements (admin + own student; trainers use trainer_placement_overview()) --
create policy placements_select on public.placements for select to authenticated using (
  public.is_admin() or student_id = public.my_student_id());
create policy placements_admin_write on public.placements for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy interviews_select on public.placement_interviews for select to authenticated using (
  exists (select 1 from public.placements p where p.id = placement_id and (public.is_admin() or p.student_id = public.my_student_id())));
create policy interviews_admin_write on public.placement_interviews for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- student documents ---------------------------------------------------
create policy documents_select on public.student_documents for select to authenticated using (
  public.is_admin() or student_id = public.my_student_id());
create policy documents_insert on public.student_documents for insert to authenticated with check (
  uploaded_by = auth.uid() and verified = false and (public.is_admin() or student_id = public.my_student_id())
  and file_path like student_id::text || '/%');
create policy documents_admin_update on public.student_documents for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy documents_admin_delete on public.student_documents for delete to authenticated using (public.is_admin());

-- announcements -------------------------------------------------------
create policy announcements_select on public.announcements for select to authenticated using (
  public.is_admin() or created_by = auth.uid() or (
    published_at <= now() and (expires_at is null or expires_at > now()) and (
      audience = 'all'
      or (audience = 'students' and public.my_role() = 'student')
      or (audience = 'trainers' and public.my_role() = 'trainer')
      or (audience = 'batch' and (public.student_in_batch(public.my_student_id(), batch_id) or public.trainer_teaches_batch(batch_id))))));
create policy announcements_insert on public.announcements for insert to authenticated with check (
  created_by = auth.uid() and (public.is_admin() or (audience = 'batch' and public.trainer_teaches_batch(batch_id))));
create policy announcements_update on public.announcements for update to authenticated
  using (public.is_admin() or created_by = auth.uid()) with check (public.is_admin() or created_by = auth.uid());
create policy announcements_delete on public.announcements for delete to authenticated
  using (public.is_admin() or created_by = auth.uid());

-- notifications -------------------------------------------------------
create policy notifications_select on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated using (recipient_id = auth.uid());

-- audit logs ------------------------------------------------------------
create policy audit_select on public.audit_logs for select to authenticated using (public.is_admin());

-- Anonymous users get nothing except verify_certificate().
revoke all on all tables in schema public from anon;
