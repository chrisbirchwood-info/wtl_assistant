-- Dodanie tabel kursów i zapisów studentów
-- Umożliwia nauczycielom przeglądanie listy studentów na ich kursach

-- 1. Tabela kursów
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wtl_course_id VARCHAR(255), -- ID kursu w systemie WTL
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'completed'
  max_students INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela zapisów studentów na kursy
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'enrolled', -- 'enrolled', 'completed', 'dropped'
  progress_percentage DECIMAL(5,2) DEFAULT 0.00,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unikalny zapis studenta na kurs
  UNIQUE(course_id, student_id)
);

-- 3. Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_wtl_id ON courses(wtl_course_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON course_enrollments(status);

-- 4. Triggery dla updated_at
CREATE TRIGGER update_courses_updated_at 
  BEFORE UPDATE ON courses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at 
  BEFORE UPDATE ON course_enrollments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Komentarze wyjaśniające
COMMENT ON TABLE courses IS 'Kursy prowadzone przez nauczycieli';
COMMENT ON TABLE course_enrollments IS 'Zapisy studentów na kursy';
COMMENT ON COLUMN courses.teacher_id IS 'ID nauczyciela prowadzącego kurs';
COMMENT ON COLUMN course_enrollments.student_id IS 'ID studenta zapisanego na kurs';
