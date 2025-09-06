-- Manual creation of thread_notes table and policies (idempotent)

-- 1) Create table (if not exists)
CREATE TABLE IF NOT EXISTS public.thread_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  content_html TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_thread_notes_thread_id ON public.thread_notes(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_notes_created_at ON public.thread_notes(created_at);

-- 3) Optional trigger (only if helper function exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_thread_notes_updated_at ON public.thread_notes';
    EXECUTE 'CREATE TRIGGER update_thread_notes_updated_at BEFORE UPDATE ON public.thread_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
  END IF;
END
$$;

-- 4) RLS + policies
ALTER TABLE public.thread_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read thread notes" ON public.thread_notes;
CREATE POLICY "Owners can read thread notes" ON public.thread_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = thread_notes.thread_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can insert thread notes" ON public.thread_notes;
CREATE POLICY "Owners can insert thread notes" ON public.thread_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = thread_notes.thread_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can update thread notes" ON public.thread_notes;
CREATE POLICY "Owners can update thread notes" ON public.thread_notes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = thread_notes.thread_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can delete thread notes" ON public.thread_notes;
CREATE POLICY "Owners can delete thread notes" ON public.thread_notes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = thread_notes.thread_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can view student thread notes" ON public.thread_notes;
CREATE POLICY "Teachers can view student thread notes" ON public.thread_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.threads t
      JOIN public.course_enrollments ce ON ce.student_id = t.user_id
      JOIN public.course_teachers ct ON ct.course_id = ce.course_id AND ct.is_active = true
      WHERE t.id = thread_notes.thread_id AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.user_roles ur ON ur.user_id = u.id
      WHERE u.id = auth.uid() AND ur.role_code IN ('admin','superadmin')
    )
  );

DROP POLICY IF EXISTS "Teachers can modify student thread notes" ON public.thread_notes;
CREATE POLICY "Teachers can modify student thread notes" ON public.thread_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.threads t
      JOIN public.course_enrollments ce ON ce.student_id = t.user_id
      JOIN public.course_teachers ct ON ct.course_id = ce.course_id AND ct.is_active = true
      WHERE t.id = thread_notes.thread_id AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.user_roles ur ON ur.user_id = u.id
      WHERE u.id = auth.uid() AND ur.role_code IN ('admin','superadmin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.threads t
      JOIN public.course_enrollments ce ON ce.student_id = t.user_id
      JOIN public.course_teachers ct ON ct.course_id = ce.course_id AND ct.is_active = true
      WHERE t.id = thread_notes.thread_id AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.user_roles ur ON ur.user_id = u.id
      WHERE u.id = auth.uid() AND ur.role_code IN ('admin','superadmin')
    )
  );

