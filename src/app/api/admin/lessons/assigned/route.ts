import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: return lesson_ids that are already assigned to any course
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('course_lessons')
      .select('lesson_id')

    if (error) {
      console.error('Error fetching assigned lessons:', error)
      return NextResponse.json({ success: false, message: 'Błąd pobierania przypisań lekcji' }, { status: 500 })
    }

    const lesson_ids = Array.from(new Set((data || []).map((r: { lesson_id: string }) => r.lesson_id)))
    return NextResponse.json({ success: true, lesson_ids })
  } catch (err) {
    console.error('GET /api/admin/lessons/assigned error:', err)
    return NextResponse.json({ success: false, message: 'Wystąpił błąd' }, { status: 500 })
  }
}
