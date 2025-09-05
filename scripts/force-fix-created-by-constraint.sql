-- Force fix created_by constraint

-- 1. Drop the existing constraint
ALTER TABLE public.thread_survey_connections 
DROP CONSTRAINT thread_survey_connections_created_by_fkey;

-- 2. Add correct constraint to public.users
ALTER TABLE public.thread_survey_connections 
ADD CONSTRAINT thread_survey_connections_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id);

-- 3. Verify the constraint points to public.users
SELECT 
    tc.constraint_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_schema,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name='thread_survey_connections'
      AND kcu.column_name='created_by';
