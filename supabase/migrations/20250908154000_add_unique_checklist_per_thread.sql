-- Ensure one checklist per thread
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uniq_thread_checklists_thread_id'
  ) THEN
    CREATE UNIQUE INDEX uniq_thread_checklists_thread_id
      ON public.thread_checklists(thread_id);
  END IF;
END $$;

