-- Add RLS policies for all tables to fix access issues

-- Profiles table policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- User roles table policies  
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles during registration" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Classes table policies
CREATE POLICY "Users can view classes they are enrolled in or created" 
ON public.classes 
FOR SELECT 
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE enrollments.class_id = classes.id 
    AND enrollments.student_id = auth.uid()
  )
);

CREATE POLICY "Faculty can create classes" 
ON public.classes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('faculty', 'admin')
  )
);

CREATE POLICY "Faculty can update their own classes" 
ON public.classes 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Enrollments table policies
CREATE POLICY "Students can view their own enrollments" 
ON public.enrollments 
FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Faculty can view enrollments for their classes" 
ON public.enrollments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.classes 
    WHERE classes.id = enrollments.class_id 
    AND classes.created_by = auth.uid()
  )
);

CREATE POLICY "Students can enroll themselves" 
ON public.enrollments 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

-- Attendance table policies
CREATE POLICY "Students can view their own attendance" 
ON public.attendance 
FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Faculty can view attendance for their classes" 
ON public.attendance 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.classes 
    WHERE classes.id = attendance.class_id 
    AND classes.created_by = auth.uid()
  )
);

CREATE POLICY "Students can create their own attendance records" 
ON public.attendance 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Faculty can update attendance for their classes" 
ON public.attendance 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.classes 
    WHERE classes.id = attendance.class_id 
    AND classes.created_by = auth.uid()
  )
);

-- Settings table policies (admin only)
CREATE POLICY "Admins can manage settings" 
ON public.settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);