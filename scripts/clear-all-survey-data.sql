-- Clear all survey data from database

-- 1. Delete all survey connections
DELETE FROM public.thread_survey_connections;

-- 2. Delete all survey answers
DELETE FROM public.survey_answers;

-- 3. Delete all survey responses
DELETE FROM public.survey_responses;

-- 4. Delete all survey forms
DELETE FROM public.survey_forms;

-- 5. Verify cleanup
SELECT 
  (SELECT COUNT(*) FROM public.survey_forms) as forms_count,
  (SELECT COUNT(*) FROM public.survey_responses) as responses_count,
  (SELECT COUNT(*) FROM public.survey_answers) as answers_count,
  (SELECT COUNT(*) FROM public.thread_survey_connections) as connections_count;

SELECT 'All survey data cleared successfully' as status;
