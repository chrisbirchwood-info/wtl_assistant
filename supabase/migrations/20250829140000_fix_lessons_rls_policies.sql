-- Poprawka polityk RLS dla tabeli lessons
-- Dodanie polityk INSERT i UPDATE

-- Usuń istniejące polityki (jeśli istnieją)
DROP POLICY IF EXISTS "Users can view lessons for their courses" ON lessons;
DROP POLICY IF EXISTS "Users can insert lessons for their courses" ON lessons;
DROP POLICY IF EXISTS "Users can update lessons for their courses" ON lessons;

-- Polityka SELECT - odczyt lekcji
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

-- Polityka INSERT - wstawianie lekcji (dla synchronizacji)
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
    -- LUB superadmin może wszystko
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'superadmin'
    )
  );

-- Polityka UPDATE - aktualizacja lekcji
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
    -- LUB superadmin może wszystko
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'superadmin'
    )
  );

-- Polityka DELETE - usuwanie lekcji (tylko dla nauczycieli)
CREATE POLICY "Users can delete lessons for their courses" ON lessons
  FOR DELETE USING (
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
    -- LUB superadmin może wszystko
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'superadmin'
    )
  );
