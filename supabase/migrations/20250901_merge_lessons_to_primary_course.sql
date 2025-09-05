-- Merge lessons.course_id to a single primary course for a given training
-- Context: multiple course rows share the same wtl_course_id; lessons were distributed across them.
-- This migration remaps all such lessons to the chosen primary course ID.

-- Parameters (adjust if needed):
-- Primary course UUID for training '3'
DO $$
DECLARE
  v_wtl text := '3';
  v_primary uuid := 'f221d368-5e66-4ee9-8762-40ec39d7d617';
BEGIN
  -- Safety check: ensure primary exists and belongs to the same training
  IF NOT EXISTS (
    SELECT 1 FROM courses WHERE id = v_primary AND wtl_course_id = v_wtl
  ) THEN
    RAISE NOTICE 'Primary course id % not found for training % — skipping', v_primary, v_wtl;
    RETURN;
  END IF;

  -- Remap all lessons from sibling course_ids to the primary course
  UPDATE lessons
  SET course_id = v_primary
  WHERE course_id IN (
    SELECT id FROM courses WHERE wtl_course_id = v_wtl
  )
  AND course_id <> v_primary;
END $$;
