-- =====================================================================
-- Briwon Academy Portal — 0005 Lead (enquiry) management
-- Admissions enquiries before someone becomes a student. Admin only.
-- =====================================================================

create table public.leads (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null check (length(trim(full_name)) >= 2),
  phone            text not null,
  email            text,
  city             text,
  course_id        uuid references public.courses (id) on delete set null,   -- course of interest
  source           text not null default 'walk_in'
                   check (source in ('walk_in', 'phone', 'website', 'referral', 'social_media', 'event', 'other')),
  status           text not null default 'new'
                   check (status in ('new', 'contacted', 'follow_up', 'visited', 'converted', 'lost')),
  next_follow_up   date,
  lost_reason      text,
  notes            text,
  student_id       uuid unique references public.students (id) on delete set null,  -- set when converted
  converted_at     timestamptz,
  created_by       uuid references public.profiles (id) default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (status <> 'lost' or lost_reason is not null),
  check (status <> 'converted' or student_id is not null)
);
create index leads_status_idx on public.leads (status);
create index leads_follow_up_idx on public.leads (next_follow_up) where status not in ('converted', 'lost');
create index leads_phone_idx on public.leads (phone);

create table public.lead_activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete cascade,
  kind        text not null check (kind in ('note', 'call', 'email', 'whatsapp', 'visit', 'status')),
  body        text not null check (length(trim(body)) >= 1),
  created_by  uuid references public.profiles (id) default auth.uid(),
  created_at  timestamptz not null default now()
);
create index lead_activities_lead_idx on public.lead_activities (lead_id, created_at desc);

create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create trigger leads_audit after insert or update or delete on public.leads
  for each row execute function public.audit_trigger();

-- Record status changes in the activity timeline automatically.
create or replace function public.leads_track_status()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status is distinct from old.status then
    insert into public.lead_activities (lead_id, kind, body, created_by)
    values (new.id, 'status',
            format('Status changed from %s to %s', replace(old.status, '_', ' '), replace(new.status, '_', ' '))
              || case when new.status = 'lost' and new.lost_reason is not null then ': ' || new.lost_reason else '' end,
            auth.uid());
  end if;
  return new;
end $$;
create trigger leads_status_trg after update on public.leads
  for each row execute function public.leads_track_status();

-- RLS: only admins can see or change leads (prospects' contact details are private).
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

create policy leads_admin_all on public.leads for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy lead_activities_admin_read on public.lead_activities for select to authenticated
  using (public.is_admin());
create policy lead_activities_admin_insert on public.lead_activities for insert to authenticated
  with check (public.is_admin() and kind <> 'status' and created_by = auth.uid());
-- Activities are an append-only history: no update/delete policies.

revoke all on public.leads, public.lead_activities from anon;
