import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH: reorder positions for lessons in a course (batched)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params
    const body = await request.json()
    const items = Array.isArray(body?.items) ? body.items : []
    if (items.length === 0) {
      return NextResponse.json({ success: false, message: 'Brak elementów do zmiany kolejności' }, { status: 400 })
    }

    // Validate course
    const { data: course } = await supabase.from('courses').select('id').eq('id', courseId).single()
    if (!course) return NextResponse.json({ success: false, message: 'Kurs nie istnieje' }, { status: 404 })

    // Batch upsert positions using composite unique (course_id, lesson_id)
    const rows = items
      .filter((it: any) => it.lesson_id && typeof it.position === 'number')
      .map((it: any) => ({ course_id: courseId, lesson_id: it.lesson_id, position: it.position }))

    const { error } = await supabase
      .from('course_lessons')
      .upsert(rows, { onConflict: 'course_id,lesson_id' })

    if (error) {
      return NextResponse.json({ success: false, message: 'Błąd zapisu kolejności', error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH reorder course lessons error:', error)
    return NextResponse.json({ success: false, message: 'Wystąpił błąd', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

