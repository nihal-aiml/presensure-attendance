-- Fix user_roles RLS policy to allow role insertion during registration
-- Drop the existing INSERT policy and create a more permissive one
DROP POLICY IF EXISTS "Users can insert their own roles during registration" ON public.user_roles;

-- Create a new policy that allows authenticated users to insert roles for themselves
-- This handles the case where the user is authenticated but the session might not be fully propagated
CREATE POLICY "Allow role insertion during registration" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  -- Allow if the user_id matches the authenticated user
  auth.uid() = user_id OR
  -- Or if this is being inserted by the auth system (for new signups)
  auth.role() = 'service_role'
);