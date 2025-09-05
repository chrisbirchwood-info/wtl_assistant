-- Fix function to use public.users instead of auth.users for email lookup

DROP FUNCTION IF EXISTS link_thread_to_survey_form(uuid, text, uuid);

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
  
  -- Get student email from public.users (not auth.users)
  SELECT u.email INTO v_student_email
  FROM public.users u
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

-- Also fix sync function
DROP FUNCTION IF EXISTS sync_waiting_survey_connections();

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
    -- Get student email from public.users (not auth.users)
    SELECT u.email INTO v_student_email
    FROM public.users u
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
