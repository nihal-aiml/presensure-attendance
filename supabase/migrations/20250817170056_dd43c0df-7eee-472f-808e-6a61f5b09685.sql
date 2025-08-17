-- Recreate RLS policies safely (drop then create)

-- profiles
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner" on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists "Admins/Faculty can view all profiles" on public.profiles;
create policy "Admins/Faculty can view all profiles" on public.profiles
for select to authenticated using (
  public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty')
);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
for update to authenticated using (id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
for insert to authenticated with check (id = auth.uid());

-- user_roles
drop policy if exists "Users can read their roles" on public.user_roles;
create policy "Users can read their roles" on public.user_roles
for select to authenticated using (user_id = auth.uid());

drop policy if exists "Admins can manage roles" on public.user_roles;
create policy "Admins can manage roles" on public.user_roles
for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- classes
drop policy if exists "Anyone authenticated can view classes if enrolled or creator or admin" on public.classes;
create policy "Anyone authenticated can view classes if enrolled or creator or admin" on public.classes
for select to authenticated using (
  created_by = auth.uid() or 
  public.has_role(auth.uid(), 'admin') or
  exists (
    select 1 from public.enrollments e where e.class_id = classes.id and e.student_id = auth.uid()
  )
);

drop policy if exists "Faculty/Admin can create classes" on public.classes;
create policy "Faculty/Admin can create classes" on public.classes
for insert to authenticated with check (
  public.has_role(auth.uid(), 'faculty') or public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Owner/Admin can update classes" on public.classes;
create policy "Owner/Admin can update classes" on public.classes
for update to authenticated using (
  created_by = auth.uid() or public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Owner/Admin can delete classes" on public.classes;
create policy "Owner/Admin can delete classes" on public.classes
for delete to authenticated using (
  created_by = auth.uid() or public.has_role(auth.uid(), 'admin')
);

-- enrollments
drop policy if exists "Users can view enrollments related to them or their classes" on public.enrollments;
create policy "Users can view enrollments related to them or their classes" on public.enrollments
for select to authenticated using (
  student_id = auth.uid() or 
  public.has_role(auth.uid(), 'admin') or
  exists (select 1 from public.classes c where c.id = enrollments.class_id and c.created_by = auth.uid())
);

drop policy if exists "Faculty/Admin can modify enrollments" on public.enrollments;
create policy "Faculty/Admin can modify enrollments" on public.enrollments
for all to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'))
with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'));

-- attendance
drop policy if exists "Students can view their attendance" on public.attendance;
create policy "Students can view their attendance" on public.attendance
for select to authenticated using (student_id = auth.uid());

drop policy if exists "Faculty/Admin can view all attendance" on public.attendance;
create policy "Faculty/Admin can view all attendance" on public.attendance
for select to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'));

drop policy if exists "Students can create own attendance if enrolled" on public.attendance;
create policy "Students can create own attendance if enrolled" on public.attendance
for insert to authenticated with check (
  student_id = auth.uid() and 
  exists (select 1 from public.enrollments e where e.class_id = attendance.class_id and e.student_id = auth.uid())
);

drop policy if exists "Only Faculty/Admin can update attendance (status)" on public.attendance;
create policy "Only Faculty/Admin can update attendance (status)" on public.attendance
for update to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'));

drop policy if exists "Only Admin can delete attendance" on public.attendance;
create policy "Only Admin can delete attendance" on public.attendance
for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- settings
drop policy if exists "Admins/Faculty can view settings" on public.settings;
create policy "Admins/Faculty can view settings" on public.settings
for select to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'));

drop policy if exists "Admins manage settings" on public.settings;
create policy "Admins manage settings" on public.settings
for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Storage policies (drop then create)
drop policy if exists "Users can read own face images" on storage.objects;
create policy "Users can read own face images" on storage.objects
for select to authenticated using (
  bucket_id = 'faces' and (auth.uid()::text = (storage.foldername(name))[1] or
  public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'))
);

drop policy if exists "Users can upload own face images" on storage.objects;
create policy "Users can upload own face images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'faces' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update/delete own face images" on storage.objects;
create policy "Users can update/delete own face images" on storage.objects
for update to authenticated using (
  bucket_id = 'faces' and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'faces' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Admins/Faculty can manage faces bucket" on storage.objects;
create policy "Admins/Faculty can manage faces bucket" on storage.objects
for all to authenticated using (
  bucket_id = 'faces' and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'))
) with check (
  bucket_id = 'faces' and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'faculty'))
);
