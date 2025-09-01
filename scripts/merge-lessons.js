import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Defaults for current task (trainingId=3 → primary courseId=f221d368-...)
const WTL_COURSE_ID = process.env.MERGE_WTL_COURSE_ID || '3'
const PRIMARY_COURSE_ID = process.env.MERGE_PRIMARY_COURSE_ID || 'f221d368-5e66-4ee9-8762-40ec39d7d617'

async function main() {
  console.log('Merging lessons.course_id for training', WTL_COURSE_ID, '→', PRIMARY_COURSE_ID)

  // Verify primary belongs to given training
  const { data: primaryCourse, error: primaryErr } = await supabase
    .from('courses')
    .select('id')
    .eq('id', PRIMARY_COURSE_ID)
    .eq('wtl_course_id', WTL_COURSE_ID)
    .single()
  if (primaryErr || !primaryCourse) {
    console.error('Primary course does not exist for this training. Abort.', primaryErr?.message)
    process.exit(1)
  }

  // Fetch all sibling courses for this training
  const { data: siblingCourses, error: siblingErr } = await supabase
    .from('courses')
    .select('id')
    .eq('wtl_course_id', WTL_COURSE_ID)
  if (siblingErr) {
    console.error('Failed to fetch sibling courses:', siblingErr.message)
    process.exit(1)
  }
  const allIds = (siblingCourses || []).map((c) => c.id)
  const toRemap = allIds.filter((id) => id !== PRIMARY_COURSE_ID)

  console.log('Sibling course ids:', allIds)
  console.log('To remap from:', toRemap)
  if (toRemap.length === 0) {
    console.log('Nothing to remap — only the primary course exists. Done.')
    return
  }

  // Count lessons before
  const { data: beforeCounts } = await supabase
    .from('lessons')
    .select('course_id', { count: 'exact' })
    .in('course_id', allIds)
  console.log('Before merge — lesson rows matching training:', beforeCounts?.length || 0)

  // Update lessons
  const { error: updErr } = await supabase
    .from('lessons')
    .update({ course_id: PRIMARY_COURSE_ID })
    .in('course_id', toRemap)
  if (updErr) {
    console.error('Update failed:', updErr.message)
    process.exit(1)
  }

  // Validate after
  const { data: afterRows } = await supabase
    .from('lessons')
    .select('id')
    .in('course_id', toRemap)
    .limit(1)
  if (afterRows && afterRows.length > 0) {
    console.warn('Some lessons still reference non-primary course ids. Please re-run or check constraints.')
  } else {
    console.log('Merge completed. All lessons for training', WTL_COURSE_ID, 'point to', PRIMARY_COURSE_ID)
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e)
  process.exit(1)
})

