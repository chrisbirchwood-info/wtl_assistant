-- Flexible Survey Response System
-- Allows for incremental data loading and different form structures

-- Forms metadata table
CREATE TABLE IF NOT EXISTS public.survey_forms (
  form_id text PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES auth.users(id),
  title text,
  description text,
  questions jsonb, -- Store form structure
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_synced_at timestamptz,
  total_responses integer DEFAULT 0
);
-- Individual responses (normalized)
CREATE TABLE IF NOT EXISTS public.survey_responses_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id text NOT NULL, -- Google's response ID
  form_id text NOT NULL REFERENCES public.survey_forms(form_id),
  respondent_email text,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(response_id, form_id)
);
-- Individual answers (key-value pairs)
CREATE TABLE IF NOT EXISTS public.survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.survey_responses_v2(id) ON DELETE CASCADE,
  question_id text NOT NULL, -- Google's question ID
  question_text text,
  question_type text, -- MULTIPLE_CHOICE, SHORT_ANSWER, PARAGRAPH_TEXT, etc.
  answer_text text,
  answer_value jsonb, -- For complex answers (arrays, objects)
  created_at timestamptz DEFAULT now()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_forms_teacher_id ON public.survey_forms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_v2_form_id ON public.survey_responses_v2(form_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_v2_submitted_at ON public.survey_responses_v2(submitted_at);
CREATE INDEX IF NOT EXISTS idx_survey_answers_response_id ON public.survey_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_question_id ON public.survey_answers(question_id);
-- RLS Policies
ALTER TABLE public.survey_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;
-- Teachers can only see their own forms
CREATE POLICY "Teachers can manage their own forms" ON public.survey_forms
  FOR ALL USING (auth.uid() = teacher_id);
-- Teachers can only see responses to their forms
CREATE POLICY "Teachers can view responses to their forms" ON public.survey_responses_v2
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.survey_forms 
      WHERE survey_forms.form_id = survey_responses_v2.form_id 
      AND survey_forms.teacher_id = auth.uid()
    )
  );
-- Teachers can only see answers to their form responses
CREATE POLICY "Teachers can view answers to their form responses" ON public.survey_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.survey_responses_v2 
      JOIN public.survey_forms ON survey_forms.form_id = survey_responses_v2.form_id
      WHERE survey_responses_v2.id = survey_answers.response_id 
      AND survey_forms.teacher_id = auth.uid()
    )
  );
-- Note: Superadmin policies will be added after users table is created in later migration

-- Function to get form statistics
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
  FROM public.survey_responses_v2 sr
  LEFT JOIN public.survey_answers sa ON sr.id = sa.response_id
  WHERE sr.form_id = p_form_id;
END;
$$;
