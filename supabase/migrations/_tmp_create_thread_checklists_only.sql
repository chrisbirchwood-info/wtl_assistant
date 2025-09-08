CREATE TABLE IF NOT EXISTS public.thread_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  due_at TIMESTAMPTZ NULL,
  visibility TEXT NOT NULL DEFAULT 'private', -- 'public' | 'private'
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

