CREATE TABLE IF NOT EXISTS public.thread_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.thread_checklists(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thread_checklist_items_checklist_id ON public.thread_checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_thread_checklist_items_position ON public.thread_checklist_items(position);

