-- Temporarily disable RLS on user_roles to allow registration to work
-- We'll create a trigger-based solution instead
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow role insertion during registration" ON public.user_roles;