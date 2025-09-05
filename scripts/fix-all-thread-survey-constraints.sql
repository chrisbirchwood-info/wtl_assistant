-- Fix all foreign key constraints in thread_survey_connections

-- 1. Drop all existing constraints
ALTER TABLE public.thread_survey_connections DROP CONSTRAINT IF EXISTS thread_survey_connections_thread_id_fkey;
ALTER TABLE public.thread_survey_connections DROP CONSTRAINT IF EXISTS thread_survey_connections_form_id_fkey;
ALTER TABLE public.thread_survey_connections DROP CONSTRAINT IF EXISTS thread_survey_connections_survey_response_id_fkey;
ALTER TABLE public.thread_survey_connections DROP CONSTRAINT IF EXISTS thread_survey_connections_created_by_fkey;

-- 2. Add correct constraints pointing to public tables
ALTER TABLE public.thread_survey_connections 
ADD CONSTRAINT thread_survey_connections_thread_id_fkey 
FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE;

ALTER TABLE public.thread_survey_connections 
ADD CONSTRAINT thread_survey_connections_form_id_fkey 
FOREIGN KEY (form_id) REFERENCES public.survey_forms(form_id) ON DELETE CASCADE;

ALTER TABLE public.thread_survey_connections 
ADD CONSTRAINT thread_survey_connections_survey_response_id_fkey 
FOREIGN KEY (survey_response_id) REFERENCES public.survey_responses(id) ON DELETE SET NULL;

ALTER TABLE public.thread_survey_connections 
ADD CONSTRAINT thread_survey_connections_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id);

-- 3. Test insert
INSERT INTO public.thread_survey_connections (
  thread_id, 
  form_id, 
  created_by
) VALUES (
  'da69d5ed-4be3-4a3a-b27d-257aba123456'::uuid,  -- Fake thread ID for test
  '1VPUjsaLD4jmEpP3XZSr4FolHd1d1uXAQCHv3qx6atgU',
  '7f22b763-65c5-4921-a2a0-cc9469638fab'
) ON CONFLICT (thread_id, form_id) DO NOTHING;

-- 4. Clean up test
DELETE FROM public.thread_survey_connections WHERE thread_id = 'da69d5ed-4be3-4a3a-b27d-257aba123456'::uuid;

SELECT 'All thread_survey_connections constraints fixed' as status;
