-- Migration: Add course_lessons table with backfill from lessons.course_id
-- Date: 2025-09-01 08:10:00

SET check_function_bodies = false;

-- 1) course_lessons mapping table
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  position integer NOT NULL,
  required boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (course_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_course_lessons_course_pos
  ON public.course_lessons (course_id, position);

-- 2) Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_course_lessons_updated_at ON public.course_lessons;
CREATE TRIGGER trg_update_course_lessons_updated_at
  BEFORE UPDATE ON public.course_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Backfill from lessons.course_id/order_number where applicable
INSERT INTO public.course_lessons (id, course_id, lesson_id, position, required)
SELECT gen_random_uuid(), l.course_id, l.id,
       COALESCE(l.order_number,
         ROW_NUMBER() OVER (PARTITION BY l.course_id ORDER BY l.created_at)
       ) AS position,
       false
FROM public.lessons l
WHERE l.course_id IS NOT NULL
ON CONFLICT (course_id, lesson_id) DO NOTHING;

