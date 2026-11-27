-- =====================================================================
-- Briwon Academy Portal — 0004 Private storage buckets & policies
-- All buckets are PRIVATE. Files are served through short-lived signed
-- URLs created on the server after an authorization check.
--
--   student-files  : <student_id>/<category>/<file>   (documents, submissions,
--                    projects, internship reports, resumes, photos)
--   course-files   : <batch_id>/<file>                (assignment attachments)
--   admin-files    : <anything>                       (fee waiver documents etc.)
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('student-files', 'student-files', false, 10485760, array[
     'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/zip', 'application/x-zip-compressed',
     'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']),
  ('course-files', 'course-files', false, 10485760, array[
     'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/zip', 'application/x-zip-compressed',
     'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']),
  ('admin-files', 'admin-files', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

-- student-files
create policy "student files read" on storage.objects for select to authenticated using (
  bucket_id = 'student-files' and (
    public.is_admin()
    or public.try_uuid((storage.foldername(name))[1]) = public.my_student_id()
    or public.trainer_teaches_student(public.try_uuid((storage.foldername(name))[1]))
    or exists (select 1 from public.internships i
               where i.student_id = public.try_uuid((storage.foldername(name))[1]) and i.mentor_id = public.my_trainer_id())));
create policy "student files upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'student-files' and (
    public.is_admin() or public.try_uuid((storage.foldername(name))[1]) = public.my_student_id()));
create policy "student files admin delete" on storage.objects for delete to authenticated using (
  bucket_id = 'student-files' and public.is_admin());

-- course-files
create policy "course files read" on storage.objects for select to authenticated using (
  bucket_id = 'course-files' and (
    public.can_manage_batch(public.try_uuid((storage.foldername(name))[1]))
    or public.student_in_batch(public.my_student_id(), public.try_uuid((storage.foldername(name))[1]))));
create policy "course files write" on storage.objects for insert to authenticated with check (
  bucket_id = 'course-files' and public.can_manage_batch(public.try_uuid((storage.foldername(name))[1])));
create policy "course files delete" on storage.objects for delete to authenticated using (
  bucket_id = 'course-files' and public.can_manage_batch(public.try_uuid((storage.foldername(name))[1])));

-- admin-files
create policy "admin files all" on storage.objects for all to authenticated
  using (bucket_id = 'admin-files' and public.is_admin())
  with check (bucket_id = 'admin-files' and public.is_admin());
