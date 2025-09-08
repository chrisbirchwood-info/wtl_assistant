-- Create lesson sections (note/checklist) with visibility and per-user progress
-- This execution copy omits the DO helper block (assumes update_updated_at_column exists)

-- 1) lesson_sections (definition of tasks per lesson)
CREATE TABLE IF NOT EXISTS public.lesson_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note_task','checklist_task')),
  title TEXT NOT NULL,
  content_html TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  due_at TIMESTAMP WITH TIME ZONE,
  visibility TEXT NOT NULL DEFAULT 'private',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_sections_lesson_id ON public.lesson_sections(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_sections_visibility ON public.lesson_sections(visibility);
CREATE INDEX IF NOT EXISTS idx_lesson_sections_position ON public.lesson_sections(position);
CREATE INDEX IF NOT EXISTS idx_lesson_sections_due_at ON public.lesson_sections(due_at);

DROP TRIGGER IF EXISTS update_lesson_sections_updated_at ON public.lesson_sections;
CREATE TRIGGER update_lesson_sections_updated_at
  BEFORE UPDATE ON public.lesson_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2) lesson_section_checklist_items (items for checklist_task)
CREATE TABLE IF NOT EXISTS public.lesson_section_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.lesson_sections(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_section_items_section_id ON public.lesson_section_checklist_items(section_id);
CREATE INDEX IF NOT EXISTS idx_lesson_section_items_position ON public.lesson_section_checklist_items(position);

-- 3) lesson_section_progress (per-user status)
CREATE TABLE IF NOT EXISTS public.lesson_section_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.lesson_sections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('todo','in_progress','done')) DEFAULT 'todo',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(section_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_section_progress_section ON public.lesson_section_progress(section_id);
CREATE INDEX IF NOT EXISTS idx_lesson_section_progress_user ON public.lesson_section_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_section_progress_status ON public.lesson_section_progress(status);

DROP TRIGGER IF EXISTS update_lesson_section_progress_updated_at ON public.lesson_section_progress;
CREATE TRIGGER update_lesson_section_progress_updated_at
  BEFORE UPDATE ON public.lesson_section_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4) lesson_section_checklist_progress (per-user checks)
CREATE TABLE IF NOT EXISTS public.lesson_section_checklist_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.lesson_section_checklist_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_section_check_progress_item ON public.lesson_section_checklist_progress(item_id);
CREATE INDEX IF NOT EXISTS idx_lesson_section_check_progress_user ON public.lesson_section_checklist_progress(user_id);

-- 5) RLS policies
ALTER TABLE public.lesson_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_section_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_section_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_section_checklist_progress ENABLE ROW LEVEL SECURITY;

-- Teachers/admins manage lesson sections (course context via lessons.course_id)
DROP POLICY IF EXISTS "Teachers manage lesson sections" ON public.lesson_sections;
CREATE POLICY "Teachers manage lesson sections" ON public.lesson_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.course_teachers ct ON ct.course_id = l.course_id AND ct.is_active = true
      WHERE l.id = lesson_sections.lesson_id AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_code IN ('admin','superadmin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.course_teachers ct ON ct.course_id = l.course_id AND ct.is_active = true
      WHERE l.id = lesson_sections.lesson_id AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_code IN ('admin','superadmin')
    )
  );

-- Students see only public sections of their course
DROP POLICY IF EXISTS "Students view public lesson sections" ON public.lesson_sections;
CREATE POLICY "Students view public lesson sections" ON public.lesson_sections
  FOR SELECT USING (
    lesson_sections.visibility = 'public' AND EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.course_enrollments ce ON ce.course_id = l.course_id
      WHERE l.id = lesson_sections.lesson_id AND ce.student_id = auth.uid()
    )
  );

-- Checklist items: teachers manage, students can view if section public
DROP POLICY IF EXISTS "Teachers manage checklist items" ON public.lesson_section_checklist_items;
CREATE POLICY "Teachers manage checklist items" ON public.lesson_section_checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.lesson_sections s
      JOIN public.lessons l ON l.id = s.lesson_id
      JOIN public.course_teachers ct ON ct.course_id = l.course_id AND ct.is_active = true
      WHERE s.id = lesson_section_checklist_items.section_id AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_code IN ('admin','superadmin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lesson_sections s
      JOIN public.lessons l ON l.id = s.lesson_id
      JOIN public.course_teachers ct ON ct.course_id = l.course_id AND ct.is_active = true
      WHERE s.id = lesson_section_checklist_items.section_id AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_code IN ('admin','superadmin')
    )
  );

DROP POLICY IF EXISTS "Students view checklist items" ON public.lesson_section_checklist_items;
CREATE POLICY "Students view checklist items" ON public.lesson_section_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.lesson_sections s
      JOIN public.lessons l ON l.id = s.lesson_id
      JOIN public.course_enrollments ce ON ce.course_id = l.course_id
      WHERE s.id = lesson_section_checklist_items.section_id
        AND s.visibility = 'public'
        AND ce.student_id = auth.uid()
    )
  );

-- Progress: users modify their own; teachers can view/modify for their course; admins allowed
DROP POLICY IF EXISTS "Users modify own section progress" ON public.lesson_section_progress;
CREATE POLICY "Users modify own section progress" ON public.lesson_section_progress
  FOR ALL USING (lesson_section_progress.user_id = auth.uid())
  WITH CHECK (lesson_section_progress.user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers manage section progress" ON public.lesson_section_progress;
CREATE POLICY "Teachers manage section progress" ON public.lesson_section_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.lesson_sections s
      JOIN public.lessons l ON l.id = s.lesson_id
      JOIN public.course_teachers ct ON ct.course_id = l.course_id AND ct.is_active = true
      WHERE s.id = lesson_section_progress.section_id AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_code IN ('admin','superadmin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lesson_sections s
      JOIN public.lessons l ON l.id = s.lesson_id
      JOIN public.course_teachers ct ON ct.course_id = l.course_id AND ct.is_active = true
      WHERE s.id = lesson_section_progress.section_id AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_code IN ('admin','superadmin')
    )
  );

-- Checklist progress: users modify own; teachers/admins can view
DROP POLICY IF EXISTS "Users modify own checklist progress" ON public.lesson_section_checklist_progress;
CREATE POLICY "Users modify own checklist progress" ON public.lesson_section_checklist_progress
  FOR ALL USING (lesson_section_checklist_progress.user_id = auth.uid())
  WITH CHECK (lesson_section_checklist_progress.user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers view checklist progress" ON public.lesson_section_checklist_progress;
CREATE POLICY "Teachers view checklist progress" ON public.lesson_section_checklist_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.lesson_section_checklist_items i
      JOIN public.lesson_sections s ON s.id = i.section_id
      JOIN public.lessons l ON l.id = s.lesson_id
      JOIN public.course_teachers ct ON ct.course_id = l.course_id AND ct.is_active = true
      WHERE i.id = lesson_section_checklist_progress.item_id AND ct.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_code IN ('admin','superadmin')
    )
  );
