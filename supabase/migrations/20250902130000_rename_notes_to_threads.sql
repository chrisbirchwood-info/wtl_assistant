-- Migration: Rename notes -> threads
-- Date: 2025-09-02 13:00:00

-- 0) Drop old policies on notes and note_lesson_connections (before rename)
DO $$ BEGIN
  BEGIN
    DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
    DROP POLICY IF EXISTS "Users can create their own notes" ON public.notes;
    DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
    DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
    DROP POLICY IF EXISTS "Teachers can view student notes" ON public.notes;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DROP POLICY IF EXISTS "Users can view connections for their notes" ON public.note_lesson_connections;
    DROP POLICY IF EXISTS "Users can create connections for their notes" ON public.note_lesson_connections;
    DROP POLICY IF EXISTS "Users can update connections for their notes" ON public.note_lesson_connections;
    DROP POLICY IF EXISTS "Users can delete connections for their notes" ON public.note_lesson_connections;
    DROP POLICY IF EXISTS "Teachers can view student note connections" ON public.note_lesson_connections;
  EXCEPTION WHEN undefined_table THEN NULL; END;
END $$;

-- 1) Rename core tables
ALTER TABLE IF EXISTS public.notes RENAME TO threads;
ALTER TABLE IF EXISTS public.note_lesson_connections RENAME COLUMN note_id TO thread_id;
ALTER TABLE IF EXISTS public.note_lesson_connections RENAME TO thread_lesson_connections;

-- 2) Rename indexes
ALTER INDEX IF EXISTS idx_notes_user_id RENAME TO idx_threads_user_id;
ALTER INDEX IF EXISTS idx_notes_created_at RENAME TO idx_threads_created_at;
ALTER INDEX IF EXISTS idx_notes_author_id RENAME TO idx_threads_author_id;
ALTER INDEX IF EXISTS idx_notes_course_id RENAME TO idx_threads_course_id;
ALTER INDEX IF EXISTS idx_note_lesson_connections_note_id RENAME TO idx_thread_lesson_connections_thread_id;
ALTER INDEX IF EXISTS idx_note_lesson_connections_lesson_id RENAME TO idx_thread_lesson_connections_lesson_id;
ALTER INDEX IF EXISTS idx_note_lesson_connections_type RENAME TO idx_thread_lesson_connections_type;

-- 3) Fix foreign keys and references
ALTER TABLE IF EXISTS public.thread_lesson_connections
  DROP CONSTRAINT IF EXISTS note_lesson_connections_note_id_fkey,
  ADD CONSTRAINT thread_lesson_connections_thread_id_fkey FOREIGN KEY (thread_id)
    REFERENCES public.threads(id) ON DELETE CASCADE;

-- 4) Rename trigger
DO $$ BEGIN
  BEGIN
    ALTER TRIGGER update_notes_updated_at ON public.threads RENAME TO update_threads_updated_at;
  EXCEPTION WHEN undefined_object THEN NULL; END;
END $$;

-- 5) Ensure RLS enabled
ALTER TABLE IF EXISTS public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.thread_lesson_connections ENABLE ROW LEVEL SECURITY;

-- 6) Recreate policies for threads
DROP POLICY IF EXISTS "Users can view their own threads" ON public.threads;
CREATE POLICY "Users can view their own threads" ON public.threads
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own threads" ON public.threads;
CREATE POLICY "Users can create their own threads" ON public.threads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own threads" ON public.threads;
CREATE POLICY "Users can update their own threads" ON public.threads
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own threads" ON public.threads;
CREATE POLICY "Users can delete their own threads" ON public.threads
  FOR DELETE USING (auth.uid() = user_id);

-- Teacher visibility based on enrollments/assignments
DROP POLICY IF EXISTS "Teachers can view student threads" ON public.threads;
CREATE POLICY "Teachers can view student threads" ON public.threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM course_enrollments ce
      JOIN course_teachers ct ON ct.course_id = ce.course_id AND ct.is_active = true
      WHERE ce.student_id = threads.user_id
        AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.id = auth.uid() AND ur.role_code IN ('admin','superadmin')
    )
  );

-- Connections policies
DROP POLICY IF EXISTS "Users can view thread connections" ON public.thread_lesson_connections;
CREATE POLICY "Users can view thread connections" ON public.thread_lesson_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = thread_lesson_connections.thread_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create thread connections" ON public.thread_lesson_connections;
CREATE POLICY "Users can create thread connections" ON public.thread_lesson_connections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = thread_lesson_connections.thread_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update thread connections" ON public.thread_lesson_connections;
CREATE POLICY "Users can update thread connections" ON public.thread_lesson_connections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = thread_lesson_connections.thread_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete thread connections" ON public.thread_lesson_connections;
CREATE POLICY "Users can delete thread connections" ON public.thread_lesson_connections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = thread_lesson_connections.thread_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can view student thread connections" ON public.thread_lesson_connections;
CREATE POLICY "Teachers can view student thread connections" ON public.thread_lesson_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.threads t
      JOIN course_enrollments ce ON ce.student_id = t.user_id
      JOIN course_teachers ct ON ct.course_id = ce.course_id AND ct.is_active = true
      WHERE t.id = thread_lesson_connections.thread_id
        AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.id = auth.uid() AND ur.role_code IN ('admin','superadmin')
    )
  );
