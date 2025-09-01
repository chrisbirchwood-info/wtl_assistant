import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: list mapped lessons for a course with positions
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params

    // Ensure course exists
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single()
    if (courseErr || !course) {
      return NextResponse.json({ success: false, message: 'Kurs nie istnieje' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('course_lessons')
      .select('lesson_id, position, required, lesson:lessons(id, wtl_lesson_id, title)')
      .eq('course_id', courseId)
      .order('position', { ascending: true })

    if (error) {
      return NextResponse.json({ success: false, message: 'Błąd pobierania lekcji', error: error.message }, { status: 500 })
    }

    const items = (data || []).map((row: any) => ({
      lesson_id: row.lesson_id,
      position: row.position,
      required: row.required,
      wtl_lesson_id: row.lesson?.wtl_lesson_id,
      title: row.lesson?.title,
    }))

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('GET course lessons error:', error)
    return NextResponse.json({ success: false, message: 'Wystąpił błąd', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

// POST: attach a lesson to a course (at end of list)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params
    const body = await request.json()
    let lessonIds: string[] = []
    if (Array.isArray(body?.lesson_ids)) {
      lessonIds = (body.lesson_ids as any[]).map((v) => String(v))
    } else if (Array.isArray(body?.lesson_id)) {
      // Backward compatibility: accept lesson_id as array
      lessonIds = (body.lesson_id as any[]).map((v) => String(v))
    } else if (body?.lesson_id) {
      lessonIds = [String(body.lesson_id)]
    }

    if (!lessonIds || lessonIds.length === 0) {
      return NextResponse.json({ success: false, message: 'Brak lesson_id/lesson_ids' }, { status: 400 })
    }

    // Validate course and lesson
    const { data: course } = await supabase.from('courses').select('id').eq('id', courseId).single()
    if (!course) return NextResponse.json({ success: false, message: 'Kurs nie istnieje' }, { status: 404 })
    const { data: lessonsFound, error: lessonsErr } = await supabase
      .from('lessons')
      .select('id, title, wtl_lesson_id')
      .in('id', lessonIds)
    if (lessonsErr) {
      return NextResponse.json({ success: false, message: 'Błąd pobierania lekcji', error: lessonsErr.message }, { status: 500 })
    }
    if (!lessonsFound || lessonsFound.length === 0) {
      return NextResponse.json({ success: false, message: 'Nie znaleziono wskazanych lekcji' }, { status: 404 })
    }

    // Check existing mappings for the course to avoid duplicates
    const { data: existingMap } = await supabase
      .from('course_lessons')
      .select('lesson_id')
      .eq('course_id', courseId)
    const existingSet = new Set((existingMap || []).map((r: any) => r.lesson_id))

    // Compute next position
    const { data: maxPosRows } = await supabase
      .from('course_lessons')
      .select('position')
      .eq('course_id', courseId)
      .order('position', { ascending: false })
      .limit(1)

    let pos = (maxPosRows && maxPosRows.length > 0) ? (maxPosRows[0].position + 1) : 1
    const idToLesson = new Map<string, any>(lessonsFound.map((l: any) => [l.id, l]))
    const rows = [] as any[]
    const addedLessons: any[] = []
    for (const id of lessonIds) {
      if (existingSet.has(id)) continue
      if (!idToLesson.has(id)) continue
      rows.push({ course_id: courseId, lesson_id: id, position: pos++, required: false })
      addedLessons.push(idToLesson.get(id))
    }

    if (rows.length === 0) {
      return NextResponse.json({ success: true, items: [], message: 'Brak nowych lekcji do przypięcia' })
    }

    const { data: insertedRows, error: insertErr } = await supabase
      .from('course_lessons')
      .insert(rows)
      .select('lesson_id, position, required')

    if (insertErr) {
      return NextResponse.json({ success: false, message: 'Błąd przypinania lekcji', error: insertErr.message }, { status: 500 })
    }

    // Merge extra lesson info for convenience
    const items = (insertedRows || []).map((r: any) => {
      const info = idToLesson.get(r.lesson_id) || {}
      return { ...r, wtl_lesson_id: info.wtl_lesson_id, title: info.title }
    })

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('POST course lessons error:', error)
    return NextResponse.json({ success: false, message: 'Wystąpił błąd', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

// DELETE: remove multiple lessons from a course
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params
    const body = await request.json().catch(() => ({}))
    let lessonIds: string[] = []
    if (Array.isArray(body?.lesson_ids)) {
      lessonIds = (body.lesson_ids as any[]).map((v) => String(v))
    } else if (Array.isArray(body?.lesson_id)) {
      lessonIds = (body.lesson_id as any[]).map((v) => String(v))
    } else if (body?.lesson_id) {
      lessonIds = [String(body.lesson_id)]
    }

    if (!lessonIds || lessonIds.length === 0) {
      return NextResponse.json({ success: false, message: 'Brak lesson_ids do usunięcia' }, { status: 400 })
    }

    // Validate course
    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single()
    if (!course) return NextResponse.json({ success: false, message: 'Kurs nie istnieje' }, { status: 404 })

    // Delete mappings
    const { error: delErr } = await supabase
      .from('course_lessons')
      .delete()
      .eq('course_id', courseId)
      .in('lesson_id', lessonIds)

    if (delErr) {
      return NextResponse.json({ success: false, message: 'Błąd usuwania lekcji z kursu', error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: lessonIds })
  } catch (error) {
    console.error('DELETE course lessons error:', error)
    return NextResponse.json({ success: false, message: 'Wystąpił błąd', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
