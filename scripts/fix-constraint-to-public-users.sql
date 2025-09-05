-- Fix survey_forms constraint to point to public.users (not auth.users)

-- 1. Drop existing constraint
ALTER TABLE public.survey_forms DROP CONSTRAINT IF EXISTS survey_forms_teacher_id_fkey;

-- 2. Add constraint to public.users (where the data actually is)
ALTER TABLE public.survey_forms 
ADD CONSTRAINT survey_forms_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. Test insert
INSERT INTO public.survey_forms (
  form_id, 
  teacher_id, 
  title
) VALUES (
  'test-form-public-users',
  '7f22b763-65c5-4921-a2a0-cc9469638fab',
  'Test Public Users'
) ON CONFLICT (form_id) DO NOTHING;

-- 4. Clean up test
DELETE FROM public.survey_forms WHERE form_id = 'test-form-public-users';

SELECT 'survey_forms constraint fixed to public.users' as status;
