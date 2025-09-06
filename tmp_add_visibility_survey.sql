ALTER TABLE public.thread_survey_connections ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';
CREATE INDEX IF NOT EXISTS idx_thread_survey_connections_visibility ON public.thread_survey_connections(visibility);
