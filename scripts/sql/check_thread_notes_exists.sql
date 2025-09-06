SELECT to_regclass('public.thread_notes') AS exists_regclass;
SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='thread_notes';
