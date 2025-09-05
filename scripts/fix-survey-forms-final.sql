-- Final fix for survey_forms foreign key constraint

-- 1. Check current constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name='survey_forms'
      AND kcu.column_name='teacher_id';

-- 2. Drop all existing constraints
ALTER TABLE public.survey_forms DROP CONSTRAINT IF EXISTS survey_forms_teacher_id_fkey;
ALTER TABLE public.survey_forms DROP CONSTRAINT IF EXISTS survey_forms_teacher_id_fkey1;
ALTER TABLE public.survey_forms DROP CONSTRAINT IF EXISTS survey_forms_teacher_id_fkey2;

-- 3. Add correct constraint
ALTER TABLE public.survey_forms 
ADD CONSTRAINT survey_forms_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Test insert
INSERT INTO public.survey_forms (
  form_id, 
  teacher_id, 
  title
) VALUES (
  'test-form-final',
  '7f22b763-65c5-4921-a2a0-cc9469638fab',
  'Test Final'
) ON CONFLICT (form_id) DO NOTHING;

-- 5. Clean up test
DELETE FROM public.survey_forms WHERE form_id = 'test-form-final';

SELECT 'survey_forms foreign key fixed successfully' as status;
