-- Tabela lekcji synchronizowanych z WTL API
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wtl_lesson_id VARCHAR(255) UNIQUE NOT NULL, -- ID z WTL API
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT,
  order_number INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksy dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_wtl_lesson_id ON lessons(wtl_lesson_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order_number ON lessons(order_number);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);

-- Funkcja do automatycznej aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_lessons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger dla tabeli lessons
CREATE TRIGGER update_lessons_updated_at 
  BEFORE UPDATE ON lessons 
  FOR EACH ROW 
  EXECUTE FUNCTION update_lessons_updated_at();

-- RLS (Row Level Security)
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Polityki dla lessons
CREATE POLICY "Users can view lessons for their courses" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = lessons.course_id 
      AND (
        -- Nauczyciel prowadzący kurs
        c.teacher_id = auth.uid()
        -- Nauczyciel przypisany do kursu
        OR EXISTS (
          SELECT 1 FROM course_teachers ct 
          WHERE ct.course_id = c.id 
          AND ct.teacher_id = auth.uid() 
          AND ct.is_active = true
        )
        -- Student zapisany na kurs
        OR EXISTS (
          SELECT 1 FROM course_enrollments ce 
          WHERE ce.course_id = c.id 
          AND ce.student_id = auth.uid() 
          AND ce.status = 'enrolled'
        )
      )
    )
  );

-- Polityka INSERT dla synchronizacji lekcji
CREATE POLICY "Users can insert lessons for their courses" ON lessons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = lessons.course_id 
      AND (
        -- Nauczyciel prowadzący kurs
        c.teacher_id = auth.uid()
        -- Nauczyciel przypisany do kursu
        OR EXISTS (
          SELECT 1 FROM course_teachers ct 
          WHERE ct.course_id = c.id 
          AND ct.teacher_id = auth.uid() 
          AND ct.is_active = true
        )
      )
    )
  );

-- Polityka UPDATE dla aktualizacji lekcji
CREATE POLICY "Users can update lessons for their courses" ON lessons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = lessons.course_id 
      AND (
        -- Nauczyciel prowadzący kurs
        c.teacher_id = auth.uid()
        -- Nauczyciel przypisany do kursu
        OR EXISTS (
          SELECT 1 FROM course_teachers ct 
          WHERE ct.course_id = c.id 
          AND ct.teacher_id = auth.uid() 
          AND ct.is_active = true
        )
      )
    )
  );

-- Dodatkowe polityki dla superadmin
CREATE POLICY "Superadmin can manage all lessons" ON lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'superadmin'
    )
  );
