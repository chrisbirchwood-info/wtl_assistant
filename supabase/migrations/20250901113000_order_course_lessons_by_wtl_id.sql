-- One-time ordering of course lessons by WTL lesson ID (numeric asc)
-- Sets position per course based on lessons.wtl_lesson_id

BEGIN;

-- Re-rank positions within each course by numeric value of wtl_lesson_id
WITH ranked AS (
  SELECT
    cl.id,
    row_number() OVER (
      PARTITION BY cl.course_id
      ORDER BY
        NULLIF(regexp_replace(l.wtl_lesson_id, '\\D', '', 'g'), '')::bigint NULLS LAST,
        l.wtl_lesson_id
    ) AS rn
  FROM public.course_lessons cl
  JOIN public.lessons l ON l.id = cl.lesson_id
)
UPDATE public.course_lessons cl
SET position = r.rn,
    updated_at = now()
FROM ranked r
WHERE cl.id = r.id;

COMMIT;

