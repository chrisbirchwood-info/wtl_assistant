-- Create thread_tasks table for per-thread tasks with due date, status and visibility
CREATE TABLE IF NOT EXISTS public.thread_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  content_html TEXT NOT NULL,
  due_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'todo', -- 'todo' | 'in_progress' | 'done'
  visibility TEXT NOT NULL DEFAULT 'private', -- 'public' | 'private'
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thread_tasks_thread_id ON public.thread_tasks(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_tasks_due_at ON public.thread_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_thread_tasks_status ON public.thread_tasks(status);
CREATE INDEX IF NOT EXISTS idx_thread_tasks_visibility ON public.thread_tasks(visibility);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_thread_tasks_updated_at ON public.thread_tasks;
CREATE TRIGGER update_thread_tasks_updated_at
  BEFORE UPDATE ON public.thread_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.thread_tasks ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (API uses service role; policies are permissive for owner/teacher when used without service role)
DROP POLICY IF EXISTS "Owners can read thread tasks" ON public.thread_tasks;
CREATE POLICY "Owners can read thread tasks" ON public.thread_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.threads t WHERE t.id = thread_tasks.thread_id AND t.user_id = auth.uid()
    )
    OR thread_tasks.visibility = 'public'
  );

DROP POLICY IF EXISTS "Owners can modify thread tasks" ON public.thread_tasks;
CREATE POLICY "Owners can modify thread tasks" ON public.thread_tasks
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.threads t WHERE t.id = thread_tasks.thread_id AND t.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.threads t WHERE t.id = thread_tasks.thread_id AND t.user_id = auth.uid())
  );

