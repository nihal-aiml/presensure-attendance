-- Fix the trigger function with proper JSON parsing
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert student role for new user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  -- Create profile with metadata from auth signup
  -- Handle the nested JSON structure properly
  INSERT INTO public.profiles (
    id, 
    full_name, 
    student_number
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      (NEW.raw_user_meta_data->'data'->>'full_name')::text
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'student_number',
      (NEW.raw_user_meta_data->'data'->>'student_number')::text
    )
  );
  
  RETURN NEW;
END;
$$;