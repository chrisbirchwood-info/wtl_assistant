-- System elastycznych notatek
-- Notatki mogą być luźne, powiązane z jedną lekcją lub wieloma lekcjami

-- Tabela notatek
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela powiązań notatka-lekcja (many-to-many)
CREATE TABLE IF NOT EXISTS note_lesson_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  lesson_id VARCHAR(255) NOT NULL, -- ID z WTL API
  connection_type VARCHAR(50) DEFAULT 'related' CHECK (connection_type IN ('primary', 'related', 'loose')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unikalne połączenie notatka-lekcja
  UNIQUE(note_id, lesson_id)
);

-- Indeksy dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
CREATE INDEX IF NOT EXISTS idx_note_lesson_connections_note_id ON note_lesson_connections(note_id);
CREATE INDEX IF NOT EXISTS idx_note_lesson_connections_lesson_id ON note_lesson_connections(lesson_id);
CREATE INDEX IF NOT EXISTS idx_note_lesson_connections_type ON note_lesson_connections(connection_type);

-- Funkcja do automatycznej aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger dla tabeli notes
CREATE TRIGGER update_notes_updated_at 
  BEFORE UPDATE ON notes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_lesson_connections ENABLE ROW LEVEL SECURITY;

-- Polityki dla notes
CREATE POLICY "Users can view their own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);

-- Dodatkowe polityki dla nauczycieli (mogą widzieć notatki studentów zapisanych na ich kursy)
CREATE POLICY "Teachers can view student notes" ON notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_teachers ct
      JOIN course_enrollments ce ON ce.course_id = ct.course_id
      WHERE ct.teacher_id = auth.uid() 
      AND ct.is_active = true
      AND ce.student_id = notes.user_id
      AND ce.status = 'enrolled'
    )
  );

-- Polityki dla note_lesson_connections
CREATE POLICY "Users can view connections for their notes" ON note_lesson_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notes 
      WHERE notes.id = note_lesson_connections.note_id 
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create connections for their notes" ON note_lesson_connections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes 
      WHERE notes.id = note_lesson_connections.note_id 
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update connections for their notes" ON note_lesson_connections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM notes 
      WHERE notes.id = note_lesson_connections.note_id 
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete connections for their notes" ON note_lesson_connections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM notes 
      WHERE notes.id = note_lesson_connections.note_id 
      AND notes.user_id = auth.uid()
    )
  );

-- Dodatkowe polityki dla nauczycieli (mogą widzieć powiązania notatek studentów zapisanych na ich kursy)
CREATE POLICY "Teachers can view student note connections" ON note_lesson_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notes n
      JOIN course_teachers ct ON ct.course_id IN (
        SELECT ce.course_id FROM course_enrollments ce 
        WHERE ce.student_id = n.user_id AND ce.status = 'enrolled'
      )
      WHERE n.id = note_lesson_connections.note_id 
      AND ct.teacher_id = auth.uid()
      AND ct.is_active = true
    )
  );
