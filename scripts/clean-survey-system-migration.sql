-- Clean migration: Remove old system and create new clean system

-- 1. Drop old system completely
DROP TABLE IF EXISTS public.survey_responses CASCADE;
DROP TABLE IF EXISTS public.thread_survey_connections CASCADE;

-- 2. Ensure survey_forms exists (should be from earlier migration)
-- If not exists, create it
CREATE TABLE IF NOT EXISTS public.survey_forms (
  form_id text PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES auth.users(id),
  title text,
  description text,
  questions jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_synced_at timestamptz,
  total_responses integer DEFAULT 0
);

-- 3. Create new clean survey_responses table (no v2)
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id text NOT NULL,
  form_id text NOT NULL REFERENCES public.survey_forms(form_id) ON DELETE CASCADE,
  respondent_email text,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(response_id, form_id)
);

-- 4. Create survey_answers table
CREATE TABLE IF NOT EXISTS public.survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  question_text text,
  question_type text,
  answer_text text,
  answer_value jsonb,
  created_at timestamptz DEFAULT now()
);

-- 5. Create thread_survey_connections with clean references
CREATE TABLE IF NOT EXISTS public.thread_survey_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  form_id text NOT NULL REFERENCES public.survey_forms(form_id) ON DELETE CASCADE,
  survey_response_id uuid REFERENCES public.survey_responses(id) ON DELETE SET NULL,
  connection_type text DEFAULT 'waiting' CHECK (connection_type IN ('waiting', 'responded', 'manual')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  synced_at timestamptz,
  
  UNIQUE(thread_id, form_id)
);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_survey_forms_teacher_id ON public.survey_forms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_form_id ON public.survey_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted_at ON public.survey_responses(submitted_at);
CREATE INDEX IF NOT EXISTS idx_survey_answers_response_id ON public.survey_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_question_id ON public.survey_answers(question_id);

CREATE INDEX IF NOT EXISTS idx_thread_survey_connections_thread_id ON public.thread_survey_connections(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_survey_connections_form_id ON public.thread_survey_connections(form_id);
CREATE INDEX IF NOT EXISTS idx_thread_survey_connections_response_id ON public.thread_survey_connections(survey_response_id);
CREATE INDEX IF NOT EXISTS idx_thread_survey_connections_type ON public.thread_survey_connections(connection_type);

-- 7. Enable RLS
ALTER TABLE public.survey_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_survey_connections ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for survey_forms
DROP POLICY IF EXISTS "Teachers can manage their own forms" ON public.survey_forms;
CREATE POLICY "Teachers can manage their own forms" ON public.survey_forms
  FOR ALL USING (auth.uid() = teacher_id);

-- 9. Create RLS policies for survey_responses
DROP POLICY IF EXISTS "Teachers can view responses to their forms" ON public.survey_responses;
DROP POLICY IF EXISTS "Teachers can insert their own survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Teachers can view their own survey responses" ON public.survey_responses;
CREATE POLICY "Teachers can view responses to their forms" ON public.survey_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.survey_forms 
      WHERE survey_forms.form_id = survey_responses.form_id 
      AND survey_forms.teacher_id = auth.uid()
    )
  );

-- 10. Create RLS policies for survey_answers  
DROP POLICY IF EXISTS "Teachers can view answers to their form responses" ON public.survey_answers;
CREATE POLICY "Teachers can view answers to their form responses" ON public.survey_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.survey_responses 
      JOIN public.survey_forms ON survey_forms.form_id = survey_responses.form_id
      WHERE survey_responses.id = survey_answers.response_id 
      AND survey_forms.teacher_id = auth.uid()
    )
  );

-- 11. Create RLS policies for thread_survey_connections
DROP POLICY IF EXISTS "Users can view their thread survey connections" ON public.thread_survey_connections;
DROP POLICY IF EXISTS "Teachers can view student thread survey connections" ON public.thread_survey_connections;
DROP POLICY IF EXISTS "Teachers can create survey thread connections" ON public.thread_survey_connections;
DROP POLICY IF EXISTS "Teachers can update their survey thread connections" ON public.thread_survey_connections;
DROP POLICY IF EXISTS "Teachers can delete their survey thread connections" ON public.thread_survey_connections;

CREATE POLICY "Users can view their thread survey connections" ON public.thread_survey_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = thread_survey_connections.thread_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view student thread survey connections" ON public.thread_survey_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.threads t
      JOIN course_enrollments ce ON ce.student_id = t.user_id
      JOIN course_teachers ct ON ct.course_id = ce.course_id AND ct.is_active = true
      WHERE t.id = thread_survey_connections.thread_id
        AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.id = auth.uid() AND ur.role_code IN ('admin','superadmin')
    )
  );

CREATE POLICY "Teachers can create survey thread connections" ON public.thread_survey_connections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.survey_forms sf
      WHERE sf.form_id = thread_survey_connections.form_id
        AND sf.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update their survey thread connections" ON public.thread_survey_connections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 
      FROM public.survey_forms sf
      WHERE sf.form_id = thread_survey_connections.form_id
        AND sf.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete their survey thread connections" ON public.thread_survey_connections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 
      FROM public.survey_forms sf
      WHERE sf.form_id = thread_survey_connections.form_id
        AND sf.teacher_id = auth.uid()
    )
  );

-- 12. Create functions with clean table names
CREATE OR REPLACE FUNCTION link_thread_to_survey_form(
  p_thread_id uuid,
  p_form_id text,
  p_teacher_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id uuid;
  v_student_email text;
  v_response_id uuid;
  v_connection_id uuid;
  v_result jsonb;
BEGIN
  -- Get thread owner (student)
  SELECT t.user_id INTO v_student_id
  FROM public.threads t
  WHERE t.id = p_thread_id;
  
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Thread not found';
  END IF;
  
  -- Get student email
  SELECT u.email INTO v_student_email
  FROM auth.users u
  WHERE u.id = v_student_id;
  
  IF v_student_email IS NULL THEN
    RAISE EXCEPTION 'Student email not found';
  END IF;
  
  -- Check if response already exists for this student and form
  SELECT sr.id INTO v_response_id
  FROM public.survey_responses sr
  WHERE sr.form_id = p_form_id 
    AND sr.respondent_email = v_student_email
  LIMIT 1;
  
  -- Create or update connection
  INSERT INTO public.thread_survey_connections (
    thread_id, 
    form_id, 
    survey_response_id, 
    connection_type,
    created_by,
    synced_at
  )
  VALUES (
    p_thread_id,
    p_form_id,
    v_response_id,
    CASE WHEN v_response_id IS NOT NULL THEN 'responded' ELSE 'waiting' END,
    p_teacher_id,
    CASE WHEN v_response_id IS NOT NULL THEN now() ELSE NULL END
  )
  ON CONFLICT (thread_id, form_id) 
  DO UPDATE SET
    survey_response_id = EXCLUDED.survey_response_id,
    connection_type = EXCLUDED.connection_type,
    synced_at = EXCLUDED.synced_at
  RETURNING id INTO v_connection_id;
  
  -- Build result
  v_result := jsonb_build_object(
    'connection_id', v_connection_id,
    'thread_id', p_thread_id,
    'form_id', p_form_id,
    'student_email', v_student_email,
    'has_response', v_response_id IS NOT NULL,
    'response_id', v_response_id,
    'status', CASE WHEN v_response_id IS NOT NULL THEN 'responded' ELSE 'waiting' END
  );
  
  RETURN v_result;
END;
$$;

-- 13. Function to sync waiting connections
CREATE OR REPLACE FUNCTION sync_waiting_survey_connections()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count integer := 0;
  v_connection record;
  v_response_id uuid;
  v_student_email text;
BEGIN
  FOR v_connection IN 
    SELECT tsc.id, tsc.thread_id, tsc.form_id, t.user_id as student_id
    FROM public.thread_survey_connections tsc
    JOIN public.threads t ON t.id = tsc.thread_id
    WHERE tsc.connection_type = 'waiting'
  LOOP
    SELECT u.email INTO v_student_email
    FROM auth.users u
    WHERE u.id = v_connection.student_id;
    
    SELECT sr.id INTO v_response_id
    FROM public.survey_responses sr
    WHERE sr.form_id = v_connection.form_id 
      AND sr.respondent_email = v_student_email
    LIMIT 1;
    
    IF v_response_id IS NOT NULL THEN
      UPDATE public.thread_survey_connections
      SET 
        survey_response_id = v_response_id,
        connection_type = 'responded',
        synced_at = now()
      WHERE id = v_connection.id;
      
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object('updated_connections', v_updated_count);
END;
$$;

-- 14. Function to get survey data for a thread
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
    CASE 
      WHEN sr.id IS NOT NULL THEN
        jsonb_agg(
          jsonb_build_object(
            'question_id', sa.question_id,
            'question_text', sa.question_text,
            'question_type', sa.question_type,
            'answer_text', sa.answer_text,
            'answer_value', sa.answer_value
          )
        )
      ELSE NULL
    END as answers
  FROM public.thread_survey_connections tsc
  JOIN public.survey_forms sf ON sf.form_id = tsc.form_id
  LEFT JOIN public.survey_responses sr ON sr.id = tsc.survey_response_id
  LEFT JOIN public.survey_answers sa ON sa.response_id = sr.id
  WHERE tsc.thread_id = p_thread_id
  GROUP BY tsc.id, tsc.form_id, sf.title, tsc.connection_type, tsc.created_at, tsc.synced_at, sr.id, sr.respondent_email, sr.submitted_at;
END;
$$;
