-- Migration: Fix notes RLS policies for teacher visibility
-- Date: 2025-09-01 08:30:00

-- Drop incorrect policies if exist
DROP POLICY IF EXISTS "Teachers can view student notes" ON notes;
DROP POLICY IF EXISTS "Teachers can view student note connections" ON note_lesson_connections;

-- Recreate teacher view policy for notes based on course assignments
-- A teacher can view notes of students who are enrolled in any course where the teacher is assigned
CREATE POLICY "Teachers can view student notes" ON notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM course_enrollments ce
      JOIN course_teachers ct ON ct.course_id = ce.course_id AND ct.is_active = true
      WHERE ce.student_id = notes.user_id
        AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.id = auth.uid() AND ur.role_code IN ('admin','superadmin')
    )
  );

-- Recreate teacher view policy for note->lesson connections in the same spirit
CREATE POLICY "Teachers can view student note connections" ON note_lesson_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM notes n
      JOIN course_enrollments ce ON ce.student_id = n.user_id
      JOIN course_teachers ct ON ct.course_id = ce.course_id AND ct.is_active = true
      WHERE n.id = note_lesson_connections.note_id
        AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.id = auth.uid() AND ur.role_code IN ('admin','superadmin')
    )
  );

