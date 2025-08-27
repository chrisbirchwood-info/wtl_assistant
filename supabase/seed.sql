-- Dodaj użytkowników testowych
INSERT INTO users (email, username, first_name, last_name, role, is_active, password_hash, created_at, updated_at) VALUES
  ('admin@example.com', 'admin', 'Admin', 'System', 'superadmin', true, 'admin', NOW(), NOW()),
  ('teacher1@example.com', 'teacher1', 'Jan', 'Kowalski', 'teacher', true, 'teacher1', NOW(), NOW()),
  ('teacher2@example.com', 'teacher2', 'Anna', 'Nowak', 'teacher', true, 'teacher2', NOW(), NOW()),
  ('student1@example.com', 'student1', 'Piotr', 'Wiśniewski', 'student', true, 'student1', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Uwaga: Dane do tabeli courses, students, course_enrollments będą dodawane przez migracje
-- lub przez synchronizację z WTL API, nie przez seed.sql
