-- Check which users tables exist

-- 1. Check auth.users
SELECT 'auth.users' as table_name, count(*) as user_count 
FROM auth.users 
WHERE id = '7f22b763-65c5-4921-a2a0-cc9469638fab';

-- 2. Check public.users  
SELECT 'public.users' as table_name, count(*) as user_count 
FROM public.users 
WHERE id = '7f22b763-65c5-4921-a2a0-cc9469638fab';

-- 3. Show current constraint details
SELECT 
    tc.constraint_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name='survey_forms' 
      AND kcu.column_name='teacher_id';
