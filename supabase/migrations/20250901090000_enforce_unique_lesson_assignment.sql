-- Migration: Enforce unique lesson assignment across all courses
-- Date: 2025-09-01 09:00:00

-- 1) Deduplicate existing rows, keep the earliest created per lesson
DELETE FROM public.course_lessons cl
USING public.course_lessons older
WHERE cl.lesson_id = older.lesson_id
  AND cl.id <> older.id
  AND cl.created_at > older.created_at;

-- 2) Ensure each lesson can belong to only one course
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_lessons_lesson_id_unique'
  ) THEN
    ALTER TABLE public.course_lessons
      ADD CONSTRAINT course_lessons_lesson_id_unique UNIQUE (lesson_id);
  END IF;
END $$;
