-- Enforce single answer per (response_id, question_id)

-- Remove duplicates, keep the lowest id (arbitrary) per pair
DELETE FROM public.survey_answers sa
USING public.survey_answers sa2
WHERE sa.response_id = sa2.response_id
  AND sa.question_id = sa2.question_id
  AND sa.id > sa2.id;

-- Create unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uniq_survey_answers_response_question
  ON public.survey_answers(response_id, question_id);

