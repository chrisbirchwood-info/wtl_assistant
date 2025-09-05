-- Drop existing functions and table
DROP FUNCTION IF EXISTS create_thread_from_survey_response(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS link_thread_to_survey_form(uuid, text, uuid);
DROP FUNCTION IF EXISTS sync_waiting_survey_connections();
DROP FUNCTION IF EXISTS get_thread_survey_data(uuid);

-- Drop existing table and recreate with new structure
DROP TABLE IF EXISTS public.thread_survey_connections CASCADE;

-- Recreate table with new schema (form-based instead of response-based)
CREATE TABLE IF NOT EXISTS public.thread_survey_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  form_id text NOT NULL REFERENCES public.survey_forms(form_id) ON DELETE CASCADE,
  survey_response_id uuid REFERENCES public.survey_responses_v2(id) ON DELETE SET NULL,
  connection_type text DEFAULT 'waiting' CHECK (connection_type IN ('waiting', 'responded', 'manual')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  synced_at timestamptz, -- When response was found and linked
  
  -- Ensure one form can only be linked to one thread per student
  UNIQUE(thread_id, form_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_thread_survey_connections_thread_id 
  ON public.thread_survey_connections(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_survey_connections_form_id 
  ON public.thread_survey_connections(form_id);
CREATE INDEX IF NOT EXISTS idx_thread_survey_connections_response_id 
  ON public.thread_survey_connections(survey_response_id);
CREATE INDEX IF NOT EXISTS idx_thread_survey_connections_type 
  ON public.thread_survey_connections(connection_type);

-- Enable RLS
ALTER TABLE public.thread_survey_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view connections for their own threads
CREATE POLICY "Users can view their thread survey connections" ON public.thread_survey_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = thread_survey_connections.thread_id
        AND t.user_id = auth.uid()
    )
  );

-- Policy: Teachers can view connections for threads of their students
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

-- Policy: Teachers can create connections for their forms
CREATE POLICY "Teachers can create survey thread connections" ON public.thread_survey_connections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.survey_forms sf
      WHERE sf.form_id = thread_survey_connections.form_id
        AND sf.teacher_id = auth.uid()
    )
  );

-- Policy: Teachers can update connections they created
CREATE POLICY "Teachers can update their survey thread connections" ON public.thread_survey_connections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 
      FROM public.survey_forms sf
      WHERE sf.form_id = thread_survey_connections.form_id
        AND sf.teacher_id = auth.uid()
    )
  );

-- Policy: Teachers can delete connections they created
CREATE POLICY "Teachers can delete their survey thread connections" ON public.thread_survey_connections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 
      FROM public.survey_forms sf
      WHERE sf.form_id = thread_survey_connections.form_id
        AND sf.teacher_id = auth.uid()
    )
  );

-- Function to link thread with survey form and check for existing response
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
  FROM public.survey_responses_v2 sr
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

-- Function to sync waiting connections and check for new responses
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
  -- Loop through all waiting connections
  FOR v_connection IN 
    SELECT tsc.id, tsc.thread_id, tsc.form_id, t.user_id as student_id
    FROM public.thread_survey_connections tsc
    JOIN public.threads t ON t.id = tsc.thread_id
    WHERE tsc.connection_type = 'waiting'
  LOOP
    -- Get student email
    SELECT u.email INTO v_student_email
    FROM auth.users u
    WHERE u.id = v_connection.student_id;
    
    -- Check for response
    SELECT sr.id INTO v_response_id
    FROM public.survey_responses_v2 sr
    WHERE sr.form_id = v_connection.form_id 
      AND sr.respondent_email = v_student_email
    LIMIT 1;
    
    -- Update connection if response found
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

-- Function to get survey data for a thread
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
  LEFT JOIN public.survey_responses_v2 sr ON sr.id = tsc.survey_response_id
  LEFT JOIN public.survey_answers sa ON sa.response_id = sr.id
  WHERE tsc.thread_id = p_thread_id
  GROUP BY tsc.id, tsc.form_id, sf.title, tsc.connection_type, tsc.created_at, tsc.synced_at, sr.id, sr.respondent_email, sr.submitted_at;
END;
$$;
