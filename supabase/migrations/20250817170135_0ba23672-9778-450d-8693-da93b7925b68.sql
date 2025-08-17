-- PresenSure: Create tables and core schema first

-- Create enums
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

-- Helper function for updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  student_number text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- User roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Helper function to check roles (security definer)
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

-- Classes table
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.classes enable row level security;

DROP TRIGGER IF EXISTS trg_classes_updated_at ON public.classes;
create trigger trg_classes_updated_at
  before update on public.classes
  for each row execute function public.update_updated_at_column();

-- Enrollments table
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

alter table public.enrollments enable row level security;

-- Attendance table
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

alter table public.attendance enable row level security;

-- Indexes for better performance
create index if not exists idx_attendance_student on public.attendance(student_id);
create index if not exists idx_attendance_class on public.attendance(class_id);
create index if not exists idx_attendance_date on public.attendance((date(attended_at)));

-- Settings table
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

DROP TRIGGER IF EXISTS trg_settings_updated_at ON public.settings;
create trigger trg_settings_updated_at
  before update on public.settings
  for each row execute function public.update_updated_at_column();

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('faces', 'faces', false)
on conflict (id) do nothing;

-- Realtime setup
alter table public.attendance replica identity full;
alter table public.enrollments replica identity full;

-- Trigger to create profile and role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Create profile
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;

  -- Assign role (default to student if none provided)
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