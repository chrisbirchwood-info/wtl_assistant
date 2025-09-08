ALTER TABLE public.thread_checklists
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'todo';

CREATE INDEX IF NOT EXISTS idx_thread_checklists_status ON public.thread_checklists(status);

