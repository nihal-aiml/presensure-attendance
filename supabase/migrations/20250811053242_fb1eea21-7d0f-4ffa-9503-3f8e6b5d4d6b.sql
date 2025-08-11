-- Fix enum creation and ensure idempotency for triggers/policies

-- Create enums safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin','faculty','student');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
    CREATE TYPE public.attendance_status AS ENUM ('approved','pending','rejected');
  END IF;
END$$;

-- Tables (idempotent)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  student_number text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Recreate triggers safely
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id and ur.role = _role
  );
$$;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

DROP TRIGGER IF EXISTS trg_classes_updated_at ON public.classes;
create trigger trg_classes_updated_at
before update on public.classes
for each row execute function public.update_updated_at_column();

alter table public.classes enable row level security;

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

alter table public.enrollments enable row level security;

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  attended_at timestamptz not null default now(),
  face_match int check (face_match between 0 and 100),
  voice_match int check (voice_match between 0 and 100),
  status public.attendance_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_attendance_student on public.attendance(student_id);
create index if not exists idx_attendance_class on public.attendance(class_id);
create index if not exists idx_attendance_date on public.attendance((date(attended_at)));

alter table public.attendance enable row level security;

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

DROP TRIGGER IF EXISTS trg_settings_updated_at ON public.settings;
create trigger trg_settings_updated_at
before update on public.settings
for each row execute function public.update_updated_at_column();

alter table public.settings enable row level security;

-- Trigger to seed profiles and roles on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;

  begin
    if (coalesce(new.raw_user_meta_data->>'role','') = '') then
      insert into public.user_roles (user_id, role) values (new.id, 'student')
      on conflict do nothing;
    else
      insert into public.user_roles (user_id, role) values (
        new.id,
        (new.raw_user_meta_data->>'role')::public.app_role
      ) on conflict do nothing;
    end if;
  exception when others then
    insert into public.user_roles (user_id, role) values (new.id, 'student')
    on conflict do nothing;
  end;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS Policies (idempotent via if not exists)
create policy if not exists "Profiles are viewable by owner" on public.profiles
for select to authenticated using (id = auth.uid());

create policy if not exists "Admins/Faculty can view all profiles" on public.profiles
for select to authenticated using (
  public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty')
);

create policy if not exists "Users can update own profile" on public.profiles
for update to authenticated using (id = auth.uid());

create policy if not exists "Users can insert own profile" on public.profiles
for insert to authenticated with check (id = auth.uid());

create policy if not exists "Users can read their roles" on public.user_roles
for select to authenticated using (user_id = auth.uid());

create policy if not exists "Admins can manage roles" on public.user_roles
for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy if not exists "Anyone authenticated can view classes if enrolled or creator or admin" on public.classes
for select to authenticated using (
  created_by = auth.uid() or 
  public.has_role(auth.uid(), 'admin') or
  exists (
    select 1 from public.enrollments e where e.class_id = classes.id and e.student_id = auth.uid()
  )
);

create policy if not exists "Faculty/Admin can create classes" on public.classes
for insert to authenticated with check (
  public.has_role(auth.uid(), 'faculty') or public.has_role(auth.uid(), 'admin')
);

create policy if not exists "Owner/Admin can update classes" on public.classes
for update to authenticated using (
  created_by = auth.uid() or public.has_role(auth.uid(), 'admin')
);

create policy if not exists "Owner/Admin can delete classes" on public.classes
for delete to authenticated using (
  created_by = auth.uid() or public.has_role(auth.uid(), 'admin')
);

create policy if not exists "Users can view enrollments related to them or their classes" on public.enrollments
for select to authenticated using (
  student_id = auth.uid() or 
  public.has_role(auth.uid(), 'admin') or
  exists (select 1 from public.classes c where c.id = enrollments.class_id and c.created_by = auth.uid())
);

create policy if not exists "Faculty/Admin can modify enrollments" on public.enrollments
for all to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'))
with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'));

create policy if not exists "Students can view their attendance" on public.attendance
for select to authenticated using (student_id = auth.uid());

create policy if not exists "Faculty/Admin can view all attendance" on public.attendance
for select to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'));

create policy if not exists "Students can create own attendance if enrolled" on public.attendance
for insert to authenticated with check (
  student_id = auth.uid() and 
  exists (select 1 from public.enrollments e where e.class_id = attendance.class_id and e.student_id = auth.uid())
);

create policy if not exists "Only Faculty/Admin can update attendance (status)" on public.attendance
for update to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'));

create policy if not exists "Only Admin can delete attendance" on public.attendance
for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy if not exists "Admins/Faculty can view settings" on public.settings
for select to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'));

create policy if not exists "Admins manage settings" on public.settings
for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Storage bucket and policies
insert into storage.buckets (id, name, public)
values ('faces', 'faces', false)
on conflict (id) do nothing;

create policy if not exists "Users can read own face images" on storage.objects
for select to authenticated using (
  bucket_id = 'faces' and (auth.uid()::text = (storage.foldername(name))[1] or
  public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'))
);

create policy if not exists "Users can upload own face images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'faces' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy if not exists "Users can update/delete own face images" on storage.objects
for update to authenticated using (
  bucket_id = 'faces' and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'faces' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy if not exists "Admins/Faculty can manage faces bucket" on storage.objects
for all to authenticated using (
  bucket_id = 'faces' and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'))
) with check (
  bucket_id = 'faces' and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'))
);

-- Realtime
alter table public.attendance replica identity full;
alter table public.enrollments replica identity full;

begin;
  alter publication supabase_realtime add table public.attendance;
exception when others then perform 1; end;

begin;
  alter publication supabase_realtime add table public.enrollments;
exception when others then perform 1; end;