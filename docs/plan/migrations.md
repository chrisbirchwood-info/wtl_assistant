# Migracje — szkice SQL (Supabase/Postgres)

Uwaga: to są szkice do wdrożenia jako pliki w `supabase/migrations/`. W repo istnieją rozszerzenia `uuid-ossp` i `pgcrypto` (dla `gen_random_uuid()`).

## 1) Wielorole: roles + user_roles + backfill

```sql
-- roles: słownik ról
CREATE TABLE IF NOT EXISTS public.roles (
  code varchar(50) PRIMARY KEY,
  name varchar(100) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- domyślne role
INSERT INTO public.roles (code, name) VALUES
  ('student', 'Student')
, ('teacher', 'Teacher')
, ('admin', 'Administrator')
, ('superadmin', 'Super Administrator')
ON CONFLICT (code) DO NOTHING;

-- user_roles: wielorole użytkowników
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_code varchar(50) NOT NULL REFERENCES public.roles(code) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role_code)
);

-- backfill z users.role (przejściowo istnieje enum user_role)
INSERT INTO public.user_roles (user_id, role_code)
SELECT u.id,
       CASE u.role
         WHEN 'student' THEN 'student'
         WHEN 'teacher' THEN 'teacher'
         WHEN 'superadmin' THEN 'superadmin'
         ELSE 'student'
       END as role_code
FROM public.users u
LEFT JOIN public.user_roles ur
  ON ur.user_id = u.id
 AND ur.role_code = (CASE u.role
         WHEN 'student' THEN 'student'
         WHEN 'teacher' THEN 'teacher'
         WHEN 'superadmin' THEN 'superadmin'
         ELSE 'student' END)
WHERE ur.id IS NULL;
```

Opcjonalnie w dalszym kroku: usunięcie `users.role` po pełnej adaptacji UI/API (osobna migracja deprecjacyjna).

## 2) Mapowanie lekcji do kursu: course_lessons + backfill

```sql
-- course_lessons: relacja M:N z pozycją i flagą "required"
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  position integer NOT NULL,
  required boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (course_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_course_lessons_course_pos
  ON public.course_lessons (course_id, position);

-- trigger do updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_course_lessons_updated_at ON public.course_lessons;
CREATE TRIGGER trg_update_course_lessons_updated_at
  BEFORE UPDATE ON public.course_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill z istniejącego lessons.course_id/order_number (jeśli używane)
INSERT INTO public.course_lessons (id, course_id, lesson_id, position, required)
SELECT gen_random_uuid(), l.course_id, l.id,
       COALESCE(l.order_number,
         ROW_NUMBER() OVER (PARTITION BY l.course_id ORDER BY l.created_at)
       ) AS position,
       false
FROM public.lessons l
WHERE l.course_id IS NOT NULL
ON CONFLICT (course_id, lesson_id) DO NOTHING;
```

Docelowo: nowych mapowań używa UI `/admin/courses/:id/lessons`. W kolejnej fazie można zdeprecjonować `lessons.course_id`.

## 3) Wątki (rename z `notes`) + rozszerzenia

```sql
-- (jeśli jeszcze nie wykonane) rename notes -> threads i powiązane nazwy
-- patrz: supabase/migrations/20250902130000_rename_notes_to_threads.sql

-- rozszerzenia kolumn (gdy wymagane)
ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS author_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS course_id uuid NULL REFERENCES public.courses(id) ON DELETE SET NULL;

-- (opcjonalnie) weryfikacja spójności istniejących danych
-- UPDATE public.threads SET course_id = ... WHERE course_id IS NULL; -- wg potrzeb
```

Polityki RLS dla `threads` są zdefiniowane w migracji rename. Ewentualne restrykcje dopracujemy po MVP.
