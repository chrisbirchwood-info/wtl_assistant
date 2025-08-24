-- Dodanie typów użytkowników
CREATE TYPE user_role AS ENUM ('student', 'teacher');

-- Aktualizacja tabeli users
ALTER TABLE users ADD COLUMN role user_role NOT NULL DEFAULT 'student';
ALTER TABLE users ADD COLUMN wtl_user_id VARCHAR(255);
ALTER TABLE users ADD COLUMN wtl_last_sync TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN wtl_sync_status VARCHAR(50) DEFAULT 'pending';

-- Tabela dla dodatkowych danych nauczycieli
CREATE TABLE teacher_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialization TEXT,
  experience_years INTEGER,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela dla dodatkowych danych kursantów
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_course_id VARCHAR(255),
  progress_percentage DECIMAL(5,2) DEFAULT 0.00,
  enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela logów synchronizacji
CREATE TABLE user_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  wtl_user_id VARCHAR(255),
  sync_type VARCHAR(50), -- 'create', 'update', 'delete'
  sync_status VARCHAR(50), -- 'success', 'failed', 'pending'
  user_role user_role,
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_wtl_id ON users(wtl_user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id ON teacher_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sync_log_user_id ON user_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sync_log_status ON user_sync_log(sync_status);

-- Triggery dla updated_at
CREATE TRIGGER update_teacher_profiles_updated_at 
  BEFORE UPDATE ON teacher_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_profiles_updated_at 
  BEFORE UPDATE ON student_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
