-- Migracja: Utworzenie testowych użytkowników
-- admin@example.com jako superadmin
-- krzysztof.brzezina@gmail.com jako teacher

-- 1. Dodaj admin@example.com jako superadmin
INSERT INTO public.users (
  id,
  email,
  username,
  first_name,
  last_name,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@example.com',
  'admin',
  'Admin',
  'User',
  'superadmin',
  true,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = now();

-- 2. Dodaj krzysztof.brzezina@gmail.com jako teacher
INSERT INTO public.users (
  id,
  email,
  username,
  first_name,
  last_name,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'krzysztof.brzezina@gmail.com',
  'krzysztof.brzezina',
  'Krzysztof',
  'Brzezina',
  'teacher',
  true,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = now();

-- 3. Dodaj odpowiednie role do tabeli user_roles (nowy system ról)
-- Dla admin@example.com
INSERT INTO public.user_roles (user_id, role_code)
SELECT u.id, 'superadmin'
FROM public.users u
WHERE u.email = 'admin@example.com'
ON CONFLICT (user_id, role_code) DO NOTHING;

-- Dla krzysztof.brzezina@gmail.com
INSERT INTO public.user_roles (user_id, role_code)
SELECT u.id, 'teacher'
FROM public.users u
WHERE u.email = 'krzysztof.brzezina@gmail.com'
ON CONFLICT (user_id, role_code) DO NOTHING;

-- 4. Utwórz profil nauczyciela dla Krzysztofa
INSERT INTO public.teacher_profiles (
  user_id,
  specialization,
  experience_years,
  bio,
  created_at,
  updated_at
)
SELECT 
  u.id,
  'Programowanie i technologie webowe',
  5,
  'Doświadczony nauczyciel programowania z pasją do nowoczesnych technologii.',
  now(),
  now()
FROM public.users u
WHERE u.email = 'krzysztof.brzezina@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  specialization = EXCLUDED.specialization,
  experience_years = EXCLUDED.experience_years,
  bio = EXCLUDED.bio,
  updated_at = now();
