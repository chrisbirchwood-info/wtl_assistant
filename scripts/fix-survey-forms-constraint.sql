-- Fix survey_forms foreign key constraint

-- Drop existing constraint if exists
ALTER TABLE public.survey_forms 
DROP CONSTRAINT IF EXISTS survey_forms_teacher_id_fkey;

-- Add correct constraint to auth.users
ALTER TABLE public.survey_forms 
ADD CONSTRAINT survey_forms_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Test insert
INSERT INTO public.survey_forms (
  form_id, 
  teacher_id, 
  title, 
  created_at, 
  updated_at
) VALUES (
  'test-form-' || gen_random_uuid()::text,
  '7f22b763-65c5-4921-a2a0-cc9469638fab',
  'Test Form',
  now(),
  now()
) ON CONFLICT (form_id) DO NOTHING;
