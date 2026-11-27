-- =====================================================================
-- Briwon Academy Portal — 0002 Functions & triggers
-- Business rules that must be trusted live here, in the database.
-- All SECURITY DEFINER functions pin search_path and check the caller.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Caller identity helpers (used by RLS policies too)
-- ---------------------------------------------------------------------
create or replace function public.is_service_call()
returns boolean language sql stable as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      or coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'), '') = 'service_role'
      or session_user in ('postgres', 'supabase_admin');
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active);
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'trainer') and is_active);
$$;

create or replace function public.my_student_id()
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select s.id from public.students s
  join public.profiles p on p.id = s.profile_id and p.is_active
  where s.profile_id = auth.uid() and s.archived_at is null;
$$;

create or replace function public.my_trainer_id()
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select t.id from public.trainers t
  join public.profiles p on p.id = t.profile_id and p.is_active and p.role = 'trainer'
  where t.profile_id = auth.uid() and t.status = 'active';
$$;

create or replace function public.trainer_teaches_batch(p_batch uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.batch_trainers where batch_id = p_batch and trainer_id = public.my_trainer_id());
$$;

create or replace function public.trainer_teaches_student(p_student uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.enrollments e
    join public.batch_trainers bt on bt.batch_id = e.batch_id
    where e.student_id = p_student and e.status in ('active', 'completed')
      and bt.trainer_id = public.my_trainer_id()
  );
$$;

create or replace function public.student_in_batch(p_student uuid, p_batch uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.enrollments
                 where student_id = p_student and batch_id = p_batch and status in ('active', 'completed'));
$$;

-- Admin or trainer of the batch
create or replace function public.can_manage_batch(p_batch uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.is_admin() or public.trainer_teaches_batch(p_batch);
$$;

create or replace function public.assert_admin()
returns void language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can perform this action' using errcode = '42501';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Codes: BRI-2026-0001, BRI-CERT-2026-0001, BRI-RCPT-2026-0001 …
-- ---------------------------------------------------------------------
create or replace function public.next_code(p_scope text, p_prefix text, p_year int default null)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_year int := coalesce(p_year, extract(year from now())::int);
  v_val int;
begin
  insert into public.id_counters (scope, year, last_value) values (p_scope, v_year, 1)
  on conflict (scope, year) do update set last_value = public.id_counters.last_value + 1
  returning last_value into v_val;
  return format('%s-%s-%s', p_prefix, v_year, lpad(v_val::text, 4, '0'));
end $$;
revoke execute on function public.next_code(text, text, int) from public, anon, authenticated;

create or replace function public.students_assign_code()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  new.email := lower(trim(new.email));
  if tg_op = 'INSERT' then
    new.student_code := public.next_code('student', 'BRI', extract(year from new.admission_date)::int);
  elsif new.student_code is distinct from old.student_code then
    raise exception 'Student ID cannot be changed';
  end if;
  return new;
end $$;
create trigger students_code before insert or update on public.students
  for each row execute function public.students_assign_code();

create or replace function public.trainers_assign_code()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  new.email := lower(trim(new.email));
  if tg_op = 'INSERT' then
    new.trainer_code := public.next_code('trainer', 'BRI-TRN');
  elsif new.trainer_code is distinct from old.trainer_code then
    raise exception 'Trainer code cannot be changed';
  end if;
  return new;
end $$;
create trigger trainers_code before insert or update on public.trainers
  for each row execute function public.trainers_assign_code();

create or replace function public.payment_assign_receipt()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  new.receipt_number := public.next_code('receipt', 'BRI-RCPT', extract(year from new.paid_on)::int);
  return new;
end $$;
create trigger payment_receipt before insert on public.payment_records
  for each row execute function public.payment_assign_receipt();

-- ---------------------------------------------------------------------
-- Profiles: auto-create on signup/invite, link to student/trainer row,
-- and never let a non-admin change role / active flag / email.
-- Role comes from app_metadata, which only the service role can set.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_role text := coalesce(new.raw_app_meta_data ->> 'role', 'student');
begin
  if v_role not in ('admin', 'trainer', 'student') then v_role := 'student'; end if;
  insert into public.profiles (id, role, full_name, email)
  values (new.id, v_role, coalesce(new.raw_user_meta_data ->> 'full_name', ''), lower(new.email))
  on conflict (id) do nothing;

  if v_role = 'student' then
    update public.students set profile_id = new.id
     where email = lower(new.email) and profile_id is null;
  elsif v_role = 'trainer' then
    update public.trainers set profile_id = new.id
     where email = lower(new.email) and profile_id is null;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.profiles_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if public.is_service_call() or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.email is distinct from old.email
     or new.id is distinct from old.id then
    raise exception 'You are not allowed to change role, status or email' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- Students may edit only their contact / career fields.
create or replace function public.students_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if public.is_service_call() or public.is_admin() then
    return new;
  end if;
  if (to_jsonb(new) - array['phone','address','emergency_contact_name','emergency_contact_phone',
        'skills','portfolio_url','resume_path','photo_path','updated_at'])
     is distinct from
     (to_jsonb(old) - array['phone','address','emergency_contact_name','emergency_contact_phone',
        'skills','portfolio_url','resume_path','photo_path','updated_at']) then
    raise exception 'You can only update your contact details, skills, portfolio and resume' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger students_guard before update on public.students
  for each row execute function public.students_guard();

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------
create or replace function public.notify(p_recipient uuid, p_type text, p_title text, p_body text default null, p_link text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_recipient is null then return; end if;
  insert into public.notifications (recipient_id, type, title, body, link)
  values (p_recipient, p_type, p_title, p_body, p_link);
end $$;
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.notify_batch_students(p_batch uuid, p_type text, p_title text, p_body text, p_link text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.notifications (recipient_id, type, title, body, link)
  select s.profile_id, p_type, p_title, p_body, p_link
  from public.enrollments e join public.students s on s.id = e.student_id
  where e.batch_id = p_batch and e.status = 'active' and s.profile_id is not null;
end $$;
revoke execute on function public.notify_batch_students(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void language sql security definer set search_path = public, pg_temp as $$
  update public.notifications set read_at = now()
  where recipient_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids));
$$;

-- ---------------------------------------------------------------------
-- Audit log (generic trigger on sensitive tables)
-- ---------------------------------------------------------------------
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id text;
  v_details jsonb;
begin
  if tg_op = 'DELETE' then
    v_id := to_jsonb(old) ->> 'id';
    v_details := jsonb_build_object('old', to_jsonb(old));
  elsif tg_op = 'UPDATE' then
    v_id := to_jsonb(new) ->> 'id';
    select jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value))
      into v_details
      from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using (key)
     where n.value is distinct from o.value and n.key <> 'updated_at';
    if v_details is null then return new; end if;
    v_details := jsonb_build_object('changes', v_details);
  else
    v_id := to_jsonb(new) ->> 'id';
    v_details := jsonb_build_object('new', to_jsonb(new));
  end if;
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name, v_id, v_details);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','students','trainers','courses','batches','batch_trainers','enrollments',
    'attendance','submissions','assessment_results','project_submissions','fees','payment_records',
    'certificates','placements','academy_settings','student_documents']
  loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t, t);
  end loop;
end $$;

create or replace function public.log_action(p_action text, p_entity text, p_entity_id text, p_details jsonb default '{}')
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'));
$$;
revoke execute on function public.log_action(text, text, text, jsonb) from public, anon;

-- ---------------------------------------------------------------------
-- Academy settings history (preserve policy history for eligibility)
-- ---------------------------------------------------------------------
create or replace function public.settings_history()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.academy_settings_history (settings, changed_by) values (to_jsonb(old), auth.uid());
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end $$;
create trigger academy_settings_history_trg before update on public.academy_settings
  for each row execute function public.settings_history();

-- ---------------------------------------------------------------------
-- Enrollment integrity: course/batch match, capacity, batch state
-- ---------------------------------------------------------------------
create or replace function public.enrollments_validate()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  b public.batches;
  v_count int;
begin
  select * into b from public.batches where id = new.batch_id;
  if b.course_id <> new.course_id then
    raise exception 'Batch % does not belong to the selected course', b.code;
  end if;
  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active' or old.batch_id <> new.batch_id) then
    if b.status in ('completed', 'cancelled') then
      raise exception 'Batch % is %, choose another batch', b.code, b.status;
    end if;
    select count(*) into v_count from public.enrollments
     where batch_id = new.batch_id and status = 'active' and id <> new.id;
    if v_count >= b.capacity then
      raise exception 'Batch % is full (capacity %)', b.code, b.capacity;
    end if;
  end if;
  return new;
end $$;
create trigger enrollments_validate before insert or update on public.enrollments
  for each row execute function public.enrollments_validate();

-- ---------------------------------------------------------------------
-- Admission: one transaction creates student + enrollment + fee record
-- ---------------------------------------------------------------------
create or replace function public.admit_student(
  p_full_name text, p_email text, p_phone text, p_course uuid, p_batch uuid,
  p_admission_date date, p_address text, p_emergency_name text, p_emergency_phone text,
  p_fee_amount numeric, p_fee_due date default null, p_status text default 'active',
  p_date_of_birth date default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_student public.students;
  v_enrollment uuid;
begin
  perform public.assert_admin();
  if p_fee_amount is null or p_fee_amount < 0 then raise exception 'Fee amount must be zero or more'; end if;

  insert into public.students (full_name, email, phone, admission_date, address, emergency_contact_name,
                               emergency_contact_phone, status, date_of_birth, created_by)
  values (trim(p_full_name), p_email, trim(p_phone), coalesce(p_admission_date, current_date), p_address,
          p_emergency_name, p_emergency_phone, coalesce(p_status, 'active'), p_date_of_birth, auth.uid())
  returning * into v_student;

  insert into public.enrollments (student_id, course_id, batch_id, enrolled_on, created_by)
  values (v_student.id, p_course, p_batch, coalesce(p_admission_date, current_date), auth.uid())
  returning id into v_enrollment;

  insert into public.fees (enrollment_id, student_id, total_amount, due_date)
  values (v_enrollment, v_student.id, p_fee_amount, p_fee_due);

  return jsonb_build_object('student_id', v_student.id, 'student_code', v_student.student_code,
                            'enrollment_id', v_enrollment);
end $$;

-- Enroll an existing student in an additional course
create or replace function public.enroll_student(p_student uuid, p_batch uuid, p_fee_amount numeric, p_fee_due date default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_course uuid;
  v_id uuid;
begin
  perform public.assert_admin();
  select course_id into v_course from public.batches where id = p_batch;
  if v_course is null then raise exception 'Batch not found'; end if;
  insert into public.enrollments (student_id, course_id, batch_id, created_by)
  values (p_student, v_course, p_batch, auth.uid()) returning id into v_id;
  insert into public.fees (enrollment_id, student_id, total_amount, due_date)
  values (v_id, p_student, coalesce(p_fee_amount, 0), p_fee_due);
  return v_id;
end $$;

-- Batch transfer keeps the old enrollment as history and moves the fee record.
create or replace function public.transfer_student(p_enrollment uuid, p_new_batch uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  e public.enrollments;
  v_new uuid;
  v_new_course uuid;
begin
  perform public.assert_admin();
  if p_reason is null or length(trim(p_reason)) < 5 then raise exception 'Please give a reason for the transfer'; end if;
  select * into e from public.enrollments where id = p_enrollment for update;
  if e.id is null or e.status <> 'active' then raise exception 'Only active enrollments can be transferred'; end if;
  if e.batch_id = p_new_batch then raise exception 'Student is already in this batch'; end if;
  select course_id into v_new_course from public.batches where id = p_new_batch;
  if v_new_course <> e.course_id then raise exception 'Transfers must stay within the same course'; end if;

  update public.enrollments set status = 'transferred', ended_on = current_date,
         notes = coalesce(notes || E'\n', '') || 'Transferred: ' || p_reason
   where id = e.id;
  insert into public.enrollments (student_id, course_id, batch_id, transferred_from, notes, created_by)
  values (e.student_id, e.course_id, p_new_batch, e.id, 'Transferred: ' || p_reason, auth.uid())
  returning id into v_new;
  update public.fees set enrollment_id = v_new where enrollment_id = e.id;

  perform public.notify((select profile_id from public.students where id = e.student_id),
    'batch_transfer', 'Your batch has changed', 'You have been moved to a new batch. Check your timetable.', '/student/timetable');
  return v_new;
end $$;

-- ---------------------------------------------------------------------
-- Fees: status derived from payments, waiver and due date
-- ---------------------------------------------------------------------
create or replace function public.fee_status(p_total numeric, p_paid numeric, p_waived numeric, p_due date)
returns text language sql immutable as $$
  select case
    when p_total - p_waived - p_paid <= 0 then case when p_waived > 0 then 'waived' else 'paid' end
    when p_due is not null and p_due < current_date then 'overdue'
    when p_paid > 0 then 'partially_paid'
    else 'pending'
  end;
$$;

create or replace function public.fees_compute()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' and new.waived_amount is distinct from old.waived_amount then
    if not (public.is_admin() or public.is_service_call()) then
      raise exception 'Only administrators can apply waivers' using errcode = '42501';
    end if;
    new.waived_by := auth.uid();
    new.waived_at := now();
  end if;
  select coalesce(sum(amount), 0) into new.amount_paid
    from public.payment_records where fee_id = new.id and not is_void;
  new.status := public.fee_status(new.total_amount, new.amount_paid, new.waived_amount, new.due_date);
  return new;
end $$;
create trigger fees_compute before insert or update on public.fees
  for each row execute function public.fees_compute();

create or replace function public.payments_refresh_fee()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.fees set updated_at = now() where id = coalesce(new.fee_id, old.fee_id);
  return coalesce(new, old);
end $$;
create trigger payments_refresh_fee after insert or update on public.payment_records
  for each row execute function public.payments_refresh_fee();

-- Payment records are append-only: only void flag / reason may change.
create or replace function public.payments_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'Payment records cannot be deleted; void them instead'; end if;
  if (to_jsonb(new) - array['is_void','void_reason','notes']) is distinct from (to_jsonb(old) - array['is_void','void_reason','notes']) then
    raise exception 'Payment records cannot be edited; void and re-enter instead';
  end if;
  if old.is_void and not new.is_void then raise exception 'A voided payment cannot be restored'; end if;
  if new.is_void and (new.void_reason is null or length(trim(new.void_reason)) < 5) then
    raise exception 'A reason is required to void a payment';
  end if;
  return new;
end $$;
create trigger payments_guard before update or delete on public.payment_records
  for each row execute function public.payments_guard();

-- ---------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------
-- Classify minutes after class start using the academy policy.
-- With defaults: 0–14 → present, 15–30 → late, 31+ → absent.
create or replace function public.attendance_status_for(p_minutes_after_start int, p_present_until int, p_late_until int)
returns text language sql immutable as $$
  select case
    when p_minutes_after_start <= p_present_until then 'present'
    when p_minutes_after_start <= p_late_until then 'late'
    else 'absent' end;
$$;

-- Great-circle distance in metres
create or replace function public.haversine_m(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)));
$$;

-- Student GPS check-in. Server time is used; location is validated against
-- the academy-configured coordinates and radius. Returns a result object
-- rather than raising so that rejected attempts are still logged.
create or replace function public.student_check_in(p_session uuid, p_lat double precision, p_lng double precision, p_accuracy double precision)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_student uuid := public.my_student_id();
  s public.class_sessions;
  st public.academy_settings;
  v_now timestamptz := now();
  v_minutes int;
  v_distance double precision;
  v_status text;
  v_recent int;
  v_result text;
begin
  if v_student is null then
    return jsonb_build_object('ok', false, 'code', 'not_student', 'message', 'Only students can check in.');
  end if;
  select * into s from public.class_sessions where id = p_session;
  if s.id is null or not public.student_in_batch(v_student, s.batch_id) then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Session not found for your batch.');
  end if;

  select count(*) into v_recent from public.check_in_attempts
   where student_id = v_student and session_id = p_session and attempted_at > v_now - interval '10 minutes';
  if v_recent >= 8 then
    return jsonb_build_object('ok', false, 'code', 'rate_limited', 'message', 'Too many attempts. Please wait a few minutes.');
  end if;

  select * into st from public.academy_settings where id = 1;
  v_minutes := floor(extract(epoch from (v_now - s.starts_at)) / 60)::int;

  if exists (select 1 from public.attendance where session_id = p_session and student_id = v_student) then
    v_result := 'duplicate';
  elsif s.status <> 'scheduled' then
    v_result := 'session_closed';
  elsif v_now < s.starts_at - make_interval(mins => st.checkin_opens_before_min) then
    v_result := 'too_early';
  elsif v_now > s.ends_at then
    v_result := 'session_ended';
  elsif st.campus_latitude is null or st.campus_longitude is null then
    v_result := 'location_not_configured';
  elsif p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    v_result := 'invalid_location';
  elsif p_accuracy is null or p_accuracy > st.max_gps_accuracy_m then
    v_result := 'low_accuracy';
  else
    v_distance := public.haversine_m(st.campus_latitude, st.campus_longitude, p_lat, p_lng);
    if v_distance > st.campus_radius_m then
      v_result := 'outside_radius';
    else
      v_result := 'ok';
    end if;
  end if;

  insert into public.check_in_attempts (session_id, student_id, result, distance_m, accuracy_m)
  values (p_session, v_student, v_result, round(v_distance::numeric, 1), p_accuracy);

  if v_result <> 'ok' then
    return jsonb_build_object('ok', false, 'code', v_result, 'distance_m', round(v_distance::numeric, 0),
      'message', case v_result
        when 'duplicate' then 'You have already checked in for this session.'
        when 'session_closed' then 'This session is not open for check-in.'
        when 'too_early' then format('Check-in opens %s minutes before class.', st.checkin_opens_before_min)
        when 'session_ended' then 'This session has ended. Ask your trainer for a correction.'
        when 'location_not_configured' then 'Campus location is not configured yet. Please tell the academy office.'
        when 'invalid_location' then 'We could not read your location.'
        when 'low_accuracy' then format('Your GPS accuracy is too low (needs %s m or better). Move near a window and retry.', st.max_gps_accuracy_m)
        when 'outside_radius' then format('You are about %s m from the academy. Check-in is allowed within %s m.', round(v_distance::numeric, 0), st.campus_radius_m)
      end);
  end if;

  v_status := public.attendance_status_for(v_minutes, st.present_until_min, st.late_until_min);
  insert into public.attendance (session_id, student_id, status, source, check_in_at, latitude, longitude, accuracy_m, distance_m, marked_by)
  values (p_session, v_student, v_status, 'check_in', v_now, p_lat, p_lng, p_accuracy, round(v_distance::numeric, 1), auth.uid());

  return jsonb_build_object('ok', true, 'status', v_status, 'minutes_after_start', v_minutes,
                            'distance_m', round(v_distance::numeric, 0),
                            'message', format('Checked in: %s', initcap(v_status)));
end $$;

-- Trainer/admin marks attendance for many students at once.
-- p_entries: [{"student_id": "...", "status": "present"}, …]
create or replace function public.staff_mark_attendance(p_session uuid, p_entries jsonb, p_reason text default null)
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare
  s public.class_sessions;
  r jsonb;
  v_count int := 0;
begin
  select * into s from public.class_sessions where id = p_session;
  if s.id is null or not public.can_manage_batch(s.batch_id) then
    raise exception 'You cannot mark attendance for this session' using errcode = '42501';
  end if;
  perform set_config('app.change_reason', coalesce(p_reason, 'Marked by staff'), true);
  for r in select * from jsonb_array_elements(p_entries) loop
    if not public.student_in_batch((r ->> 'student_id')::uuid, s.batch_id) then
      raise exception 'Student is not in this batch';
    end if;
    insert into public.attendance (session_id, student_id, status, source, marked_by)
    values (p_session, (r ->> 'student_id')::uuid, r ->> 'status', 'trainer', auth.uid())
    on conflict (session_id, student_id) do update
      set status = excluded.status, source = 'trainer', marked_by = auth.uid()
      where public.attendance.status is distinct from excluded.status;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

create or replace function public.attendance_track_history()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.attendance_history (attendance_id, old_status, new_status, changed_by, reason)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, auth.uid(),
            coalesce(nullif(current_setting('app.change_reason', true), ''), new.source));
  end if;
  return new;
end $$;
create trigger attendance_history_trg after insert or update on public.attendance
  for each row execute function public.attendance_track_history();

-- Admin approves / rejects a correction request (applies it atomically)
create or replace function public.review_attendance_correction(p_request uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r public.attendance_correction_requests;
begin
  perform public.assert_admin();
  select * into r from public.attendance_correction_requests where id = p_request for update;
  if r.id is null or r.status <> 'pending' then raise exception 'Request is not pending'; end if;
  update public.attendance_correction_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
   where id = r.id;
  if p_approve then
    perform set_config('app.change_reason', 'Correction approved: ' || r.reason, true);
    insert into public.attendance (session_id, student_id, status, source, marked_by)
    values (r.session_id, r.student_id, r.requested_status, 'correction', auth.uid())
    on conflict (session_id, student_id) do update
      set status = excluded.status, source = 'correction', marked_by = auth.uid();
  end if;
  perform public.notify((select profile_id from public.students where id = r.student_id), 'attendance_correction',
    'Attendance correction ' || case when p_approve then 'approved' else 'rejected' end, p_note, '/student/attendance');
end $$;

-- Attendance summary per student per batch (excused sessions are excluded from the denominator)
create or replace function public.attendance_summary(p_student uuid, p_batch uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  st public.academy_settings;
  v_total int; v_present int; v_late int; v_absent int; v_excused int; v_unmarked int;
  v_pct numeric;
begin
  if not (public.is_service_call() or public.is_admin() or public.trainer_teaches_batch(p_batch) or p_student = public.my_student_id()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into st from public.academy_settings where id = 1;
  select count(*),
         count(*) filter (where a.status = 'present'),
         count(*) filter (where a.status = 'late'),
         count(*) filter (where a.status = 'absent' or a.id is null),
         count(*) filter (where a.status = 'excused'),
         count(*) filter (where a.id is null)
    into v_total, v_present, v_late, v_absent, v_excused, v_unmarked
    from public.class_sessions cs
    left join public.attendance a on a.session_id = cs.id and a.student_id = p_student
   where cs.batch_id = p_batch and cs.status <> 'cancelled' and cs.starts_at <= now();
  v_pct := case when v_total - v_excused > 0
                then round((v_present + v_late * st.late_attendance_weight) * 100.0 / (v_total - v_excused), 2)
                else 0 end;
  return jsonb_build_object('total', v_total, 'present', v_present, 'late', v_late, 'absent', v_absent,
                            'excused', v_excused, 'unmarked', v_unmarked, 'pct', v_pct,
                            'late_weight', st.late_attendance_weight);
end $$;

-- ---------------------------------------------------------------------
-- Assignments & submissions
-- ---------------------------------------------------------------------
create or replace function public.assignments_notify()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    perform public.notify_batch_students(new.batch_id, 'assignment_new', 'New assignment: ' || new.title,
      'Due ' || to_char(new.deadline at time zone (select timezone from public.academy_settings where id = 1), 'DD Mon YYYY HH24:MI'),
      '/student/assignments/' || new.id);
  elsif tg_op = 'UPDATE' and new.deadline <> old.deadline and new.status = 'published' then
    perform public.notify_batch_students(new.batch_id, 'assignment_deadline_changed', 'Deadline changed: ' || new.title,
      'New deadline ' || to_char(new.deadline at time zone (select timezone from public.academy_settings where id = 1), 'DD Mon YYYY HH24:MI'),
      '/student/assignments/' || new.id);
  end if;
  return new;
end $$;
create trigger assignments_notify_trg after insert or update on public.assignments
  for each row execute function public.assignments_notify();

create or replace function public.submit_assignment(p_assignment uuid, p_text text, p_file_path text, p_url text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_student uuid := public.my_student_id();
  a public.assignments;
  st public.academy_settings;
  sub public.submissions;
  v_now timestamptz := now();
  v_late boolean;
begin
  if v_student is null then raise exception 'Only students can submit assignments' using errcode = '42501'; end if;
  select * into a from public.assignments where id = p_assignment;
  if a.id is null or a.status <> 'published' or not public.student_in_batch(v_student, a.batch_id) then
    raise exception 'Assignment not found';
  end if;
  if coalesce(trim(p_text), '') = '' and p_file_path is null and coalesce(trim(p_url), '') = '' then
    raise exception 'Submission is empty';
  end if;
  if p_file_path is not null and p_file_path not like v_student::text || '/%' then
    raise exception 'Invalid file reference';
  end if;
  if p_url is not null and p_url !~* '^https?://' then raise exception 'Links must start with http:// or https://'; end if;
  select * into st from public.academy_settings where id = 1;
  select * into sub from public.submissions where assignment_id = a.id and student_id = v_student for update;

  if sub.id is not null and sub.status = 'approved' then
    raise exception 'This submission has already been approved';
  end if;
  if sub.id is not null and sub.status = 'under_review' then
    raise exception 'Your submission is being reviewed. You can resubmit if a revision is requested.';
  end if;

  v_late := v_now > a.deadline;
  -- Late policy applies to first submissions and to resubmissions not requested by a trainer.
  if v_late and (sub.id is null or sub.status <> 'revision_required') then
    if a.late_policy = 'none' then
      raise exception 'The deadline has passed and late submissions are not accepted';
    elsif a.late_policy = 'grace' and v_now > a.deadline + make_interval(days => st.late_submission_grace_days) then
      raise exception 'The late submission window (% days) has closed', st.late_submission_grace_days;
    end if;
  end if;

  if sub.id is null then
    insert into public.submissions (assignment_id, student_id, status, content_text, file_path, external_url,
                                    original_deadline, first_submitted_at, submitted_at, is_late, attempt)
    values (a.id, v_student, case when v_late then 'late' else 'submitted' end, p_text, p_file_path, p_url,
            a.deadline, v_now, v_now, v_late, 1)
    returning * into sub;
  else
    update public.submissions
       set content_text = p_text, file_path = p_file_path, external_url = p_url, submitted_at = v_now,
           status = case when status = 'revision_required' then 'submitted'
                         when v_late then 'late' else 'submitted' end,
           -- on-time is judged on the first submission; a trainer-requested revision does not make it late
           is_late = case when first_submitted_at is null then v_late else is_late end,
           first_submitted_at = coalesce(first_submitted_at, v_now),
           attempt = attempt + 1
     where id = sub.id
     returning * into sub;
  end if;
  return jsonb_build_object('id', sub.id, 'status', sub.status, 'is_late', sub.is_late, 'attempt', sub.attempt);
end $$;

create or replace function public.review_submission(p_submission uuid, p_decision text, p_marks numeric, p_feedback text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  sub public.submissions;
  a public.assignments;
begin
  select * into sub from public.submissions where id = p_submission for update;
  select * into a from public.assignments where id = sub.assignment_id;
  if sub.id is null or not public.can_manage_batch(a.batch_id) then
    raise exception 'You cannot review this submission' using errcode = '42501';
  end if;
  if p_decision not in ('under_review', 'approved', 'revision_required') then raise exception 'Invalid decision'; end if;
  if p_marks is not null and (p_marks < 0 or p_marks > a.max_marks) then
    raise exception 'Marks must be between 0 and %', a.max_marks;
  end if;
  if p_decision = 'approved' and p_marks is null then raise exception 'Marks are required to approve'; end if;
  if p_decision = 'revision_required' and coalesce(trim(p_feedback), '') = '' then
    raise exception 'Please explain what needs to be revised';
  end if;
  update public.submissions
     set status = p_decision, marks = coalesce(p_marks, marks), feedback = coalesce(p_feedback, feedback),
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = sub.id;
  if p_decision <> 'under_review' then
    perform public.notify((select profile_id from public.students where id = sub.student_id),
      case when p_decision = 'approved' then 'submission_feedback' else 'revision_requested' end,
      case when p_decision = 'approved' then 'Feedback on ' || a.title else 'Revision requested: ' || a.title end,
      left(p_feedback, 200), '/student/assignments/' || a.id);
  end if;
end $$;

create or replace function public.submissions_track_history()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.submission_history (submission_id, attempt, status, content_text, file_path, external_url,
                                         submitted_at, is_late, marks, feedback, reviewed_by, reviewed_at)
  values (new.id, new.attempt, new.status, new.content_text, new.file_path, new.external_url,
          new.submitted_at, new.is_late, new.marks, new.feedback, new.reviewed_by, new.reviewed_at);
  return new;
end $$;
create trigger submissions_history_trg after insert or update on public.submissions
  for each row execute function public.submissions_track_history();

-- ---------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------
create or replace function public.submit_project(p_project uuid, p_file_path text, p_url text, p_notes text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_student uuid := public.my_student_id();
  p public.projects;
  v_id uuid;
begin
  if v_student is null then raise exception 'Only students can submit projects' using errcode = '42501'; end if;
  select * into p from public.projects where id = p_project;
  if p.id is null or not public.student_in_batch(v_student, p.batch_id) then raise exception 'Project not found'; end if;
  if p_file_path is null and coalesce(trim(p_url), '') = '' then raise exception 'Add a file or a project link'; end if;
  if p_file_path is not null and p_file_path not like v_student::text || '/%' then raise exception 'Invalid file reference'; end if;
  if p_url is not null and p_url !~* '^https?://' then raise exception 'Links must start with http:// or https://'; end if;
  if exists (select 1 from public.project_submissions where project_id = p.id and student_id = v_student
             and status in ('approved', 'under_review')) then
    raise exception 'This project is already under review or approved';
  end if;
  insert into public.project_submissions (project_id, student_id, file_path, project_url, notes, presentation_status)
  values (p.id, v_student, p_file_path, p_url, p_notes, case when p.requires_presentation then 'pending' else 'not_required' end)
  on conflict (project_id, student_id) do update
    set file_path = excluded.file_path, project_url = excluded.project_url, notes = excluded.notes,
        submitted_at = now(), status = 'submitted'
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.review_project(p_submission uuid, p_decision text, p_marks numeric, p_feedback text,
                                                 p_presentation_status text default null, p_presentation_at timestamptz default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  ps public.project_submissions;
  p public.projects;
begin
  select * into ps from public.project_submissions where id = p_submission for update;
  select * into p from public.projects where id = ps.project_id;
  if ps.id is null or not public.can_manage_batch(p.batch_id) then
    raise exception 'You cannot review this project' using errcode = '42501';
  end if;
  if p_decision not in ('under_review', 'approved', 'revision_required') then raise exception 'Invalid decision'; end if;
  if p_marks is not null and (p_marks < 0 or p_marks > p.max_marks) then raise exception 'Marks must be between 0 and %', p.max_marks; end if;
  if p_presentation_status is not null and p_presentation_status not in ('not_required', 'pending', 'scheduled', 'completed') then
    raise exception 'Invalid presentation status';
  end if;
  update public.project_submissions
     set status = p_decision, marks = coalesce(p_marks, marks), feedback = coalesce(p_feedback, feedback),
         presentation_status = coalesce(p_presentation_status, presentation_status),
         presentation_at = coalesce(p_presentation_at, presentation_at),
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = ps.id;
  perform public.notify((select profile_id from public.students where id = ps.student_id), 'project_feedback',
    'Project update: ' || p.title, left(p_feedback, 200), '/student/projects');
end $$;

-- ---------------------------------------------------------------------
-- Assessments
-- ---------------------------------------------------------------------
create or replace function public.record_assessment_result(p_assessment uuid, p_student uuid, p_score numeric, p_feedback text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a public.assessments;
begin
  select * into a from public.assessments where id = p_assessment;
  if a.id is null or not public.can_manage_batch(a.batch_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if not public.student_in_batch(p_student, a.batch_id) then raise exception 'Student is not in this batch'; end if;
  if p_score < 0 or p_score > a.max_marks then raise exception 'Score must be between 0 and %', a.max_marks; end if;
  insert into public.assessment_results (assessment_id, student_id, score, feedback, graded_by)
  values (a.id, p_student, p_score, p_feedback, auth.uid())
  on conflict (assessment_id, student_id) do update
    set score = excluded.score, feedback = excluded.feedback, graded_by = auth.uid(), graded_at = now();
  perform public.notify((select profile_id from public.students where id = p_student), 'assessment_result',
    'Result published: ' || a.title, null, '/student/assessments');
end $$;

-- ---------------------------------------------------------------------
-- Certificate eligibility (single source of truth)
-- ---------------------------------------------------------------------
create or replace function public.certificate_eligibility(p_enrollment uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  e public.enrollments;
  st public.academy_settings;
  f public.fees;
  v_att jsonb;
  v_req int; v_on_time int; v_passing int; v_assign_avg numeric;
  v_missing_marks jsonb;
  v_mini int; v_mini_total int; v_cap_id uuid; v_cap_presentation text; v_cap_marks numeric; v_cap_max numeric; v_cap_pct numeric;
  v_proj_avg numeric;
  v_final_pct numeric;
  v_on_time_pct numeric;
  v_overall numeric;
  v_checks jsonb := '[]';
  v_all boolean := true;
  v_grade text;
  v_balance numeric;
begin
  select * into e from public.enrollments where id = p_enrollment;
  if e.id is null then raise exception 'Enrollment not found'; end if;
  if not (public.is_admin() or public.trainer_teaches_batch(e.batch_id) or e.student_id = public.my_student_id()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into st from public.academy_settings where id = 1;

  -- 1. Attendance
  v_att := public.attendance_summary(e.student_id, e.batch_id);

  -- 2 & 3. Required assignments
  select count(*),
         count(*) filter (where s.first_submitted_at is not null and (
              s.first_submitted_at <= a.deadline or
              (st.late_within_grace_counts and s.first_submitted_at <= a.deadline + make_interval(days => st.late_submission_grace_days)))),
         count(*) filter (where s.marks is not null and s.marks >= a.max_marks * st.min_assignment_score_pct / 100),
         coalesce(avg(coalesce(s.marks, 0) * 100.0 / a.max_marks), 0),
         coalesce(jsonb_agg(a.title) filter (where s.marks is null or s.marks < a.max_marks * st.min_assignment_score_pct / 100), '[]')
    into v_req, v_on_time, v_passing, v_assign_avg, v_missing_marks
    from public.assignments a
    left join public.submissions s on s.assignment_id = a.id and s.student_id = e.student_id
   where a.batch_id = e.batch_id and a.is_required and a.status = 'published';
  v_on_time_pct := case when v_req > 0 then round(v_on_time * 100.0 / v_req, 2) else 100 end;

  -- 4–6. Projects
  select count(distinct ps.project_id) into v_mini
    from public.project_submissions ps join public.projects p on p.id = ps.project_id
   where p.batch_id = e.batch_id and p.kind = 'mini' and ps.student_id = e.student_id;
  select count(*) into v_mini_total from public.projects where batch_id = e.batch_id and kind = 'mini';
  select ps.id, ps.presentation_status, ps.marks, p.max_marks into v_cap_id, v_cap_presentation, v_cap_marks, v_cap_max
    from public.project_submissions ps join public.projects p on p.id = ps.project_id
   where p.batch_id = e.batch_id and p.kind = 'capstone' and ps.student_id = e.student_id
   order by ps.marks desc nulls last limit 1;
  v_cap_pct := case when v_cap_marks is not null then round(v_cap_marks * 100.0 / v_cap_max, 2) end;
  select coalesce(avg(coalesce(ps.marks, 0) * 100.0 / p.max_marks), 0) into v_proj_avg
    from public.projects p
    left join public.project_submissions ps on ps.project_id = p.id and ps.student_id = e.student_id
   where p.batch_id = e.batch_id;

  -- 7. Final assessment (best final result in the batch)
  select max(r.score * 100.0 / a.max_marks) into v_final_pct
    from public.assessments a join public.assessment_results r on r.assessment_id = a.id
   where a.batch_id = e.batch_id and a.is_final and r.student_id = e.student_id;

  -- 8. Fees
  select * into f from public.fees where enrollment_id = e.id;
  v_balance := coalesce(f.total_amount - f.waived_amount - f.amount_paid, 0);

  v_checks := jsonb_build_array(
    jsonb_build_object('key', 'attendance', 'label', format('Attendance at least %s%%', st.min_attendance_pct::float),
      'met', (v_att ->> 'pct')::numeric >= st.min_attendance_pct, 'value', (v_att ->> 'pct')::numeric,
      'detail', format('%s%% attended', (v_att ->> 'pct'))),
    jsonb_build_object('key', 'assignments_on_time', 'label', format('At least %s%% of required assignments submitted on time', st.min_on_time_assignments_pct::float),
      'met', v_on_time_pct >= st.min_on_time_assignments_pct, 'value', v_on_time_pct,
      'detail', format('%s of %s on time', v_on_time, v_req)),
    jsonb_build_object('key', 'assignment_marks', 'label', format('Each required assignment scores at least %s%%', st.min_assignment_score_pct::float),
      'met', v_passing = v_req, 'value', v_passing,
      'detail', case when v_passing = v_req then format('%s of %s passed', v_passing, v_req)
                     else 'Below threshold or not graded: ' || (select string_agg(x, ', ') from jsonb_array_elements_text(v_missing_marks) x) end),
    jsonb_build_object('key', 'mini_projects', 'label', format('All %s mini-projects submitted', st.required_mini_projects),
      'met', v_mini >= st.required_mini_projects, 'value', v_mini,
      'detail', format('%s of %s submitted', v_mini, greatest(st.required_mini_projects, v_mini_total))),
    jsonb_build_object('key', 'capstone_presented', 'label', 'Capstone submitted and presented',
      'met', v_cap_id is not null and v_cap_presentation = 'completed',
      'detail', case when v_cap_id is null then 'Not submitted'
                     when v_cap_presentation = 'completed' then 'Submitted and presented'
                     else 'Submitted, presentation ' || replace(v_cap_presentation, '_', ' ') end),
    jsonb_build_object('key', 'capstone_score', 'label', format('Capstone score at least %s/100', st.min_capstone_score_pct::float),
      'met', coalesce(v_cap_pct, 0) >= st.min_capstone_score_pct, 'value', v_cap_pct,
      'detail', coalesce(v_cap_pct::text || '/100', 'Not graded')),
    jsonb_build_object('key', 'final_assessment', 'label', format('Final assessment at least %s%%', st.min_final_assessment_pct::float),
      'met', coalesce(v_final_pct, 0) >= st.min_final_assessment_pct, 'value', round(v_final_pct, 2),
      'detail', coalesce(round(v_final_pct, 2)::text || '%', 'No result yet')),
    jsonb_build_object('key', 'fees', 'label', 'Course fees cleared or officially waived',
      'met', f.id is not null and v_balance <= 0, 'value', v_balance,
      'detail', case when f.id is null then 'No fee record'
                     when v_balance <= 0 then initcap(replace(f.status, '_', ' '))
                     else format('Balance due: %s', v_balance) end)
  );
  select bool_and((c ->> 'met')::boolean) into v_all from jsonb_array_elements(v_checks) c;

  v_overall := round((v_assign_avg * st.weight_assignments + v_proj_avg * st.weight_projects
                      + coalesce(v_final_pct, 0) * st.weight_final_assessment) / 100, 2);
  v_grade := case when not v_all then 'Not Yet Complete'
                  when v_overall >= st.grade_distinction_pct then 'Distinction'
                  when v_overall >= st.grade_merit_pct then 'Merit'
                  when v_overall >= st.grade_pass_pct then 'Pass'
                  else 'Not Yet Complete' end;

  return jsonb_build_object(
    'enrollment_id', e.id, 'student_id', e.student_id, 'eligible', v_all and v_grade <> 'Not Yet Complete',
    'grade', v_grade, 'overall_pct', v_overall, 'checks', v_checks,
    'metrics', jsonb_build_object(
      'attendance', v_att, 'assignment_on_time_pct', v_on_time_pct, 'required_assignments', v_req,
      'assignment_avg_pct', round(v_assign_avg, 2), 'mini_projects_submitted', v_mini,
      'capstone_pct', v_cap_pct, 'project_avg_pct', round(v_proj_avg, 2),
      'final_assessment_pct', round(v_final_pct, 2), 'fee_status', f.status, 'fee_balance', v_balance),
    'computed_at', now());
end $$;

create or replace function public.approve_certificate(p_enrollment uuid, p_completion_date date default current_date)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_elig jsonb;
  e public.enrollments;
  st public.academy_settings;
  v_id uuid;
begin
  perform public.assert_admin();
  select * into e from public.enrollments where id = p_enrollment;
  v_elig := public.certificate_eligibility(p_enrollment);
  if not (v_elig ->> 'eligible')::boolean then
    raise exception 'Student is not eligible yet: requirements are incomplete';
  end if;
  if exists (select 1 from public.certificates where enrollment_id = e.id and status = 'approved') then
    raise exception 'A certificate has already been issued for this enrollment';
  end if;
  select * into st from public.academy_settings where id = 1;
  insert into public.certificates (enrollment_id, student_id, course_id, certificate_number, status, completion_date,
                                   overall_pct, grade, eligibility_snapshot, signatory_name, signatory_title,
                                   requested_by, approved_by, approved_at)
  values (e.id, e.student_id, e.course_id, public.next_code('certificate', 'BRI-CERT'), 'approved', p_completion_date,
          (v_elig ->> 'overall_pct')::numeric, v_elig ->> 'grade', v_elig, st.certificate_signatory_name,
          st.certificate_signatory_title, auth.uid(), auth.uid(), now())
  on conflict (enrollment_id) do update
    set certificate_number = coalesce(public.certificates.certificate_number, excluded.certificate_number),
        status = 'approved', completion_date = excluded.completion_date, overall_pct = excluded.overall_pct,
        grade = excluded.grade, eligibility_snapshot = excluded.eligibility_snapshot,
        approved_by = auth.uid(), approved_at = now(), revoked_reason = null
  returning id into v_id;
  update public.enrollments set status = 'completed', ended_on = coalesce(ended_on, p_completion_date) where id = e.id;
  perform public.notify((select profile_id from public.students where id = e.student_id), 'certificate_approved',
    'Your certificate is ready', 'Congratulations! Your certificate has been approved.', '/student/certificate');
  return v_id;
end $$;

create or replace function public.revoke_certificate(p_certificate uuid, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.assert_admin();
  if p_reason is null or length(trim(p_reason)) < 5 then raise exception 'A reason is required'; end if;
  update public.certificates set status = 'revoked', revoked_reason = p_reason where id = p_certificate;
end $$;

-- Public verification: only approved, non-sensitive fields.
create or replace function public.verify_certificate(p_token uuid)
returns table (certificate_number text, student_name text, course_name text, completion_date date, grade text, status text)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.certificate_number, s.full_name, co.name, c.completion_date, c.grade, c.status
  from public.certificates c
  join public.students s on s.id = c.student_id
  join public.courses co on co.id = c.course_id
  where c.verification_token = p_token and c.status in ('approved', 'revoked');
$$;
grant execute on function public.verify_certificate(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Internships & placements notifications / guards
-- ---------------------------------------------------------------------
create or replace function public.internship_reports_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  i public.internships;
begin
  select * into i from public.internships where id = new.internship_id;
  if public.is_admin() or public.is_service_call() or i.mentor_id = public.my_trainer_id() then
    if tg_op = 'UPDATE' and (new.status is distinct from old.status or new.mentor_comment is distinct from old.mentor_comment) then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
      perform public.notify((select profile_id from public.students where id = i.student_id), 'internship_update',
        format('Week %s report: %s', new.week_number, replace(new.status, '_', ' ')), left(new.mentor_comment, 200), '/student/internship');
    end if;
    return new;
  end if;
  -- student path
  if tg_op = 'UPDATE' then
    if old.status = 'approved' then raise exception 'Approved reports cannot be changed'; end if;
    new.mentor_comment := old.mentor_comment;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.submitted_at := now();
  end if;
  new.status := 'submitted';
  return new;
end $$;
create trigger internship_reports_guard_trg before insert or update on public.internship_reports
  for each row execute function public.internship_reports_guard();

create or replace function public.placements_notify()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    perform public.notify((select profile_id from public.students where id = new.student_id), 'placement_update',
      format('Placement update: %s', new.company), 'Status: ' || initcap(replace(new.status, '_', ' ')), '/student/placement');
  end if;
  return new;
end $$;
create trigger placements_notify_trg after insert or update on public.placements
  for each row execute function public.placements_notify();

-- Trainers see placement progress of their own students without offer details or staff notes
create or replace function public.trainer_placement_overview()
returns table (placement_id uuid, student_id uuid, student_name text, company text, job_role text, status text, updated_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.id, p.student_id, s.full_name, p.company, p.job_role, p.status, p.updated_at
  from public.placements p join public.students s on s.id = p.student_id
  where public.is_staff() and (public.is_admin() or public.trainer_teaches_student(p.student_id));
$$;

-- ---------------------------------------------------------------------
-- Announcements & timetable change notifications
-- ---------------------------------------------------------------------
create or replace function public.announcements_notify()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.audience = 'batch' then
    perform public.notify_batch_students(new.batch_id, 'announcement', new.title, left(new.body, 200), '/announcements');
    insert into public.notifications (recipient_id, type, title, body, link)
    select t.profile_id, 'announcement', new.title, left(new.body, 200), '/announcements'
    from public.batch_trainers bt join public.trainers t on t.id = bt.trainer_id
    where bt.batch_id = new.batch_id and t.profile_id is not null;
  else
    insert into public.notifications (recipient_id, type, title, body, link)
    select p.id, 'announcement', new.title, left(new.body, 200), '/announcements'
    from public.profiles p
    where p.is_active and p.id is distinct from new.created_by
      and (new.audience = 'all' or (new.audience = 'students' and p.role = 'student')
           or (new.audience = 'trainers' and p.role = 'trainer'));
  end if;
  return new;
end $$;
create trigger announcements_notify_trg after insert on public.announcements
  for each row execute function public.announcements_notify();

create or replace function public.sessions_notify()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_tz text := (select timezone from public.academy_settings where id = 1);
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    perform public.notify_batch_students(new.batch_id, 'timetable_change', 'Class cancelled: ' || new.title,
      to_char(new.starts_at at time zone v_tz, 'DD Mon YYYY HH24:MI'), '/student/timetable');
  elsif new.starts_at <> old.starts_at or new.ends_at <> old.ends_at then
    perform public.notify_batch_students(new.batch_id, 'timetable_change', 'Class rescheduled: ' || new.title,
      'New time ' || to_char(new.starts_at at time zone v_tz, 'DD Mon YYYY HH24:MI'), '/student/timetable');
  end if;
  return new;
end $$;
create trigger sessions_notify_trg after update on public.class_sessions
  for each row execute function public.sessions_notify();

-- Generate class sessions for a batch from its weekly schedule
create or replace function public.generate_batch_sessions(p_batch uuid, p_from date default null, p_to date default null)
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare
  b public.batches;
  v_tz text := (select timezone from public.academy_settings where id = 1);
  v_trainer uuid;
  d date;
  v_count int := 0;
begin
  perform public.assert_admin();
  select * into b from public.batches where id = p_batch;
  select trainer_id into v_trainer from public.batch_trainers where batch_id = b.id order by is_primary desc limit 1;
  for d in select generate_series(coalesce(p_from, b.start_date), coalesce(p_to, b.end_date), interval '1 day')::date loop
    if extract(dow from d)::int = any (b.schedule_days) and not exists (
      select 1 from public.class_sessions where batch_id = b.id and (starts_at at time zone v_tz)::date = d) then
      insert into public.class_sessions (batch_id, trainer_id, title, starts_at, ends_at, location)
      values (b.id, v_trainer, b.name || ' class', (d + b.class_start_time) at time zone v_tz,
              (d + b.class_end_time) at time zone v_tz, b.location);
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- Alerts: attendance warnings, deadline reminders, low performance
-- Safe to run repeatedly (deduplicated per day). Admin-triggered or scheduled.
-- ---------------------------------------------------------------------
create or replace function public.run_daily_alerts()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  st public.academy_settings;
  r record;
  v_att jsonb;
  v_warn int := 0; v_rem int := 0; v_low int := 0;
begin
  if not (public.is_admin() or public.is_service_call()) then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into st from public.academy_settings where id = 1;

  -- Attendance warnings
  for r in select e.student_id, e.batch_id, s.profile_id from public.enrollments e
           join public.students s on s.id = e.student_id
           where e.status = 'active' and s.profile_id is not null loop
    v_att := public.attendance_summary(r.student_id, r.batch_id);
    if (v_att ->> 'total')::int >= 4 and (v_att ->> 'pct')::numeric < st.min_attendance_pct
       and not exists (select 1 from public.notifications where recipient_id = r.profile_id
                       and type = 'attendance_warning' and created_at > now() - interval '7 days') then
      perform public.notify(r.profile_id, 'attendance_warning', 'Attendance below requirement',
        format('Your attendance is %s%%. At least %s%% is required for your certificate.', v_att ->> 'pct', st.min_attendance_pct::float),
        '/student/attendance');
      v_warn := v_warn + 1;
    end if;
  end loop;

  -- Deadline reminders (due within 48h, not yet submitted)
  for r in select a.id, a.title, a.deadline, s.profile_id from public.assignments a
           join public.enrollments e on e.batch_id = a.batch_id and e.status = 'active'
           join public.students s on s.id = e.student_id and s.profile_id is not null
           where a.status = 'published' and a.deadline between now() and now() + interval '48 hours'
             and not exists (select 1 from public.submissions x where x.assignment_id = a.id and x.student_id = s.id)
             and not exists (select 1 from public.notifications n where n.recipient_id = s.profile_id
                             and n.type = 'deadline_reminder' and n.link = '/student/assignments/' || a.id) loop
    perform public.notify(r.profile_id, 'deadline_reminder', 'Due soon: ' || r.title,
      'Due ' || to_char(r.deadline at time zone st.timezone, 'DD Mon HH24:MI'), '/student/assignments/' || r.id);
    v_rem := v_rem + 1;
  end loop;

  -- Low performance alerts to trainers (avg graded assignment score below pass threshold)
  for r in select e.student_id, s.full_name, t.profile_id as trainer_profile, avg(sub.marks * 100.0 / a.max_marks) as avg_pct
           from public.enrollments e
           join public.students s on s.id = e.student_id
           join public.batch_trainers bt on bt.batch_id = e.batch_id
           join public.trainers t on t.id = bt.trainer_id and t.profile_id is not null
           join public.assignments a on a.batch_id = e.batch_id
           join public.submissions sub on sub.assignment_id = a.id and sub.student_id = e.student_id and sub.marks is not null
           where e.status = 'active'
           group by e.student_id, s.full_name, t.profile_id
           having count(sub.id) >= 2 and avg(sub.marks * 100.0 / a.max_marks) < st.min_assignment_score_pct loop
    if not exists (select 1 from public.notifications where recipient_id = r.trainer_profile and type = 'low_performance'
                   and link = '/trainer/students/' || r.student_id and created_at > now() - interval '7 days') then
      perform public.notify(r.trainer_profile, 'low_performance', 'Low performance: ' || r.full_name,
        format('Average assignment score %s%%', round(r.avg_pct, 1)), '/trainer/students/' || r.student_id);
      v_low := v_low + 1;
    end if;
  end loop;

  return jsonb_build_object('attendance_warnings', v_warn, 'deadline_reminders', v_rem, 'low_performance', v_low);
end $$;

-- ---------------------------------------------------------------------
-- Lock down execution: functions are callable only by signed-in users
-- (each checks the caller's role internally).
-- ---------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'admit_student(text,text,text,uuid,uuid,date,text,text,text,numeric,date,text,date)',
    'enroll_student(uuid,uuid,numeric,date)', 'transfer_student(uuid,uuid,text)',
    'student_check_in(uuid,double precision,double precision,double precision)',
    'staff_mark_attendance(uuid,jsonb,text)', 'review_attendance_correction(uuid,boolean,text)',
    'attendance_summary(uuid,uuid)', 'submit_assignment(uuid,text,text,text)',
    'review_submission(uuid,text,numeric,text)', 'submit_project(uuid,text,text,text)',
    'review_project(uuid,text,numeric,text,text,timestamptz)', 'record_assessment_result(uuid,uuid,numeric,text)',
    'certificate_eligibility(uuid)', 'approve_certificate(uuid,date)', 'revoke_certificate(uuid,text)',
    'trainer_placement_overview()', 'generate_batch_sessions(uuid,date,date)', 'run_daily_alerts()',
    'mark_notifications_read(uuid[])']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
