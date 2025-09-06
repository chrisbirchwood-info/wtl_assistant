ALTER TABLE public.thread_notes ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';
