-- Migration: Extend notes with author_id and course_id
-- Date: 2025-09-01 08:20:00

SET check_function_bodies = false;
-- 1) Add columns (idempotent)
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS author_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS course_id uuid NULL REFERENCES public.courses(id) ON DELETE SET NULL;
-- 2) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_notes_author_id ON public.notes(author_id);
CREATE INDEX IF NOT EXISTS idx_notes_course_id ON public.notes(course_id);
