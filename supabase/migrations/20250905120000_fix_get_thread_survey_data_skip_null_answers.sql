-- Replace get_thread_survey_data to skip null answers and return empty array when none

CREATE OR REPLACE FUNCTION get_thread_survey_data(p_thread_id uuid)
RETURNS TABLE (
  connection_id uuid,
  form_id text,
  form_title text,
  connection_type text,
  created_at timestamptz,
  synced_at timestamptz,
  response_id uuid,
  respondent_email text,
  submitted_at timestamptz,
  answers jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tsc.id as connection_id,
    tsc.form_id,
    sf.title as form_title,
    tsc.connection_type,
    tsc.created_at,
    tsc.synced_at,
    sr.id as response_id,
    sr.respondent_email,
    sr.submitted_at,
    COALESCE(
      (SELECT jsonb_agg(
          jsonb_build_object(
            'question_id', sa.question_id,
            'question_text', sa.question_text,
            'question_type', sa.question_type,
            'answer_text', sa.answer_text,
            'answer_value', sa.answer_value
          )
        ) FROM public.survey_answers sa
        WHERE sa.response_id = sr.id),
      '[]'::jsonb
    ) as answers
  FROM public.thread_survey_connections tsc
  JOIN public.survey_forms sf ON sf.form_id = tsc.form_id
  LEFT JOIN public.survey_responses sr ON sr.id = tsc.survey_response_id
  WHERE tsc.thread_id = p_thread_id
  ORDER BY tsc.created_at DESC;
END;
$$;

