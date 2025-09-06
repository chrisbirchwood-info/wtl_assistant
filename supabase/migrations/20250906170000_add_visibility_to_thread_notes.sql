-- Add visibility column to thread_notes to control per-note visibility
-- Values: 'public' (default, visible to student and teacher), 'private' (teacher-only)

ALTER TABLE public.thread_notes
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

CREATE INDEX IF NOT EXISTS idx_thread_notes_visibility ON public.thread_notes(visibility);

