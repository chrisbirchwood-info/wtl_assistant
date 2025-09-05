-- Unify survey responses tables to canonical names (no _v2)

-- Ensure canonical table exists
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id text NOT NULL,
  form_id text NOT NULL REFERENCES public.survey_forms(form_id),
  respondent_email text,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(response_id, form_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_responses_form_id ON public.survey_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted_at ON public.survey_responses(submitted_at);

-- If legacy table exists, copy data
DO $$
BEGIN
  IF to_regclass('public.survey_responses_v2') IS NOT NULL THEN
    INSERT INTO public.survey_responses (id, response_id, form_id, respondent_email, submitted_at, created_at, updated_at)
    SELECT id, response_id, form_id, respondent_email, submitted_at, created_at, updated_at
    FROM public.survey_responses_v2
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Ensure FK on survey_answers points to survey_responses
DO $$
DECLARE
  fk_name text;
BEGIN
  IF to_regclass('public.survey_answers') IS NOT NULL THEN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'public.survey_answers'::regclass
      AND contype = 'f'
      AND confrelid IN ('public.survey_responses_v2'::regclass, 'public.survey_responses'::regclass)
    LIMIT 1;

    IF fk_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.survey_answers DROP CONSTRAINT %I', fk_name);
    END IF;

    ALTER TABLE public.survey_answers
      ADD CONSTRAINT survey_answers_response_id_fkey
      FOREIGN KEY (response_id) REFERENCES public.survey_responses(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS and policy on survey_responses
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view responses to their forms" ON public.survey_responses;
CREATE POLICY "Teachers can view responses to their forms" ON public.survey_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.survey_forms 
      WHERE survey_forms.form_id = survey_responses.form_id 
        AND survey_forms.teacher_id = auth.uid()
    )
  );

-- Replace get_form_stats to reference survey_responses
CREATE OR REPLACE FUNCTION get_form_stats(p_form_id text)
RETURNS TABLE (
  total_responses bigint,
  latest_response timestamptz,
  question_count bigint,
  avg_answers_per_response numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT sr.id)::bigint as total_responses,
    MAX(sr.submitted_at) as latest_response,
    COUNT(DISTINCT sa.question_id)::bigint as question_count,
    CASE 
      WHEN COUNT(DISTINCT sr.id) > 0 
      THEN ROUND(COUNT(sa.id)::numeric / COUNT(DISTINCT sr.id)::numeric, 2)
      ELSE 0::numeric
    END as avg_answers_per_response
  FROM public.survey_responses sr
  LEFT JOIN public.survey_answers sa ON sr.id = sa.response_id
  WHERE sr.form_id = p_form_id;
END;
$$;

-- Drop legacy table if present
DO $$
BEGIN
  IF to_regclass('public.survey_responses_v2') IS NOT NULL THEN
    DROP TABLE public.survey_responses_v2;
  END IF;
END $$;
