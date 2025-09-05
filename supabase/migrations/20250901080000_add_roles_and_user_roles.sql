-- Migration: Add roles and user_roles tables + backfill from users.role
-- Date: 2025-09-01 08:00:00

SET check_function_bodies = false;
-- 1) Roles dictionary
CREATE TABLE IF NOT EXISTS public.roles (
  code varchar(50) PRIMARY KEY,
  name varchar(100) NOT NULL,
  created_at timestamptz DEFAULT now()
);
-- Seed default roles (idempotent)
INSERT INTO public.roles (code, name) VALUES
  ('student', 'Student'),
  ('teacher', 'Teacher'),
  ('admin', 'Administrator'),
  ('superadmin', 'Super Administrator')
ON CONFLICT (code) DO NOTHING;
-- 2) User roles (many-to-many)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_code varchar(50) NOT NULL REFERENCES public.roles(code) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role_code)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role_code);
-- 3) Backfill from users.role (enum user_role)
-- Map existing single role to user_roles if not already present
INSERT INTO public.user_roles (user_id, role_code)
SELECT u.id,
       CASE u.role
         WHEN 'student' THEN 'student'
         WHEN 'teacher' THEN 'teacher'
         WHEN 'superadmin' THEN 'superadmin'
         ELSE 'student'
       END AS role_code
FROM public.users u
LEFT JOIN public.user_roles ur
  ON ur.user_id = u.id
 AND ur.role_code = (
       CASE u.role
         WHEN 'student' THEN 'student'
         WHEN 'teacher' THEN 'teacher'
         WHEN 'superadmin' THEN 'superadmin'
         ELSE 'student'
       END)
WHERE ur.id IS NULL;
