-- Create a demo class for testing
INSERT INTO public.classes (id, name, code, created_by)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Demo Class',
  'DEMO101',
  (SELECT id FROM auth.users LIMIT 1)
) ON CONFLICT (id) DO NOTHING;