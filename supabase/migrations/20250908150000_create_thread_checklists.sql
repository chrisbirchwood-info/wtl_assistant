-- Create thread_checklists and thread_checklist_items for per-thread checklists
CREATE TABLE IF NOT EXISTS public.thread_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  due_at TIMESTAMPTZ NULL,
  visibility TEXT NOT NULL DEFAULT 'private', -- 'public' | 'private'
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.thread_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.thread_checklists(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thread_checklists_thread_id ON public.thread_checklists(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_checklist_items_checklist_id ON public.thread_checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_thread_checklist_items_position ON public.thread_checklist_items(position);

-- Trigger to keep updated_at in sync (function is created in earlier migrations)
DROP TRIGGER IF EXISTS update_thread_checklists_updated_at ON public.thread_checklists;
CREATE TRIGGER update_thread_checklists_updated_at
  BEFORE UPDATE ON public.thread_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.thread_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_checklist_items ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies mirroring thread_tasks visibility rules
DROP POLICY IF EXISTS "Owners can read thread checklists" ON public.thread_checklists;
CREATE POLICY "Owners can read thread checklists" ON public.thread_checklists
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.threads t WHERE t.id = thread_checklists.thread_id AND t.user_id = auth.uid())
    OR thread_checklists.visibility = 'public'
  );

DROP POLICY IF EXISTS "Owners can modify thread checklists" ON public.thread_checklists;
CREATE POLICY "Owners can modify thread checklists" ON public.thread_checklists
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.threads t WHERE t.id = thread_checklists.thread_id AND t.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.threads t WHERE t.id = thread_checklists.thread_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners/students read checklist items" ON public.thread_checklist_items;
CREATE POLICY "Owners/students read checklist items" ON public.thread_checklist_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.thread_checklists c
      JOIN public.threads t ON t.id = c.thread_id
      WHERE c.id = thread_checklist_items.checklist_id
      AND (t.user_id = auth.uid() OR c.visibility = 'public')
    )
  );

DROP POLICY IF EXISTS "Owners modify checklist items" ON public.thread_checklist_items;
CREATE POLICY "Owners modify checklist items" ON public.thread_checklist_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.thread_checklists c
      JOIN public.threads t ON t.id = c.thread_id
      WHERE c.id = thread_checklist_items.checklist_id
      AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.thread_checklists c
      JOIN public.threads t ON t.id = c.thread_id
      WHERE c.id = thread_checklist_items.checklist_id
      AND t.user_id = auth.uid()
    )
  );

