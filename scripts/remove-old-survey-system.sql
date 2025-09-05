-- Remove old survey system after migration

-- 1. Drop old survey_responses table
DROP TABLE IF EXISTS public.survey_responses CASCADE;

-- 2. Drop old google_oauth_tokens if not used elsewhere
-- (Keep this commented for now as it might be used by other features)
-- DROP TABLE IF EXISTS public.google_oauth_tokens CASCADE;

-- 3. Clean up any old functions related to surveys
DROP FUNCTION IF EXISTS create_thread_from_survey_response(uuid, uuid, text, text);

-- Confirmation
SELECT 'Old survey system removed successfully' as status;
