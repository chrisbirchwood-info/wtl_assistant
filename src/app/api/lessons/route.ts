import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (courseId) {
      // 1) Preferowane: mapowanie przez course_lessons (pozycja per-kurs)
      const { data: mappedRows, error: mapErr } = await supabase
        .from('course_lessons')
        .select('lesson_id, position, required, lesson:lessons(*)')
        .eq('course_id', courseId)
        .order('position', { ascending: true })

      if (mapErr) {
        console.error('Błąd pobierania mapowań lekcji:', mapErr)
        return NextResponse.json({ error: 'Błąd pobierania lekcji z bazy danych' }, { status: 500 })
      }

      if (mappedRows && mappedRows.length > 0) {
        // Zwracaj tylko aktywne lekcje i w kolejności pozycji z mapowania
        const mappedLessons = (mappedRows || [])
          .map((r: any) => r.lesson)
          .filter((l: any) => !!l && (l.status === 'active' || l.status === 'ACTIVE' || l.status === 'Active'))

        return NextResponse.json({ lessons: mappedLessons, count: mappedLessons.length })
      }

      // 2) Wsteczna zgodność: bez mapowania — bezpośrednio po lessons.course_id
      const { data: directLessons, error: directErr } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .eq('status', 'active')
        .order('order_number', { ascending: true })
        .limit(1000)

      if (directErr) {
        console.error('Błąd pobierania lekcji (fallback direct):', directErr)
        return NextResponse.json({ error: 'Błąd pobierania lekcji z bazy danych' }, { status: 500 })
      }

      // 3) Dalszy fallback: wszystkie kursy o tym samym wtl_course_id
      if (!directLessons || directLessons.length === 0) {
        try {
          const { data: courseRow } = await supabase
            .from('courses')
            .select('wtl_course_id')
            .eq('id', courseId)
            .single()

          if (courseRow?.wtl_course_id) {
            const { data: relatedCourses } = await supabase
              .from('courses')
              .select('id')
              .eq('wtl_course_id', courseRow.wtl_course_id)

            const ids = (relatedCourses || []).map((c: any) => c.id)
            if (ids.length > 0) {
              const { data: lessonsByTraining, error: lErr } = await supabase
                .from('lessons')
                .select('*')
                .in('course_id', ids)
                .eq('status', 'active')
                .order('order_number', { ascending: true })
                .limit(1000)

              if (!lErr && lessonsByTraining && lessonsByTraining.length > 0) {
                return NextResponse.json({ lessons: lessonsByTraining, count: lessonsByTraining.length })
              }
            }
          }
        } catch {}
      }

      return NextResponse.json({ lessons: directLessons || [], count: directLessons?.length || 0 })
    }

    // Bez courseId – wszystkie aktywne lekcje (np. dla strony notatek)
    const { data: allLessons, error: allErr } = await supabase
      .from('lessons')
      .select('*')
      .eq('status', 'active')
      .order('order_number', { ascending: true })
      .limit(1000)

    if (allErr) {
      console.error('Błąd pobierania wszystkich lekcji:', allErr)
      return NextResponse.json({ error: 'Błąd pobierania lekcji z bazy danych' }, { status: 500 })
    }

    return NextResponse.json({ lessons: allLessons || [], count: allLessons?.length || 0 })
  } catch (error) {
    console.error('Błąd API lessons:', error)
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json({ error: 'Brak courseId w parametrach' }, { status: 400 })
    }

    const body = await request.json()
    const { title, description, content, order_number } = body

    if (!title) {
      return NextResponse.json({ error: 'Tytuł lekcji jest wymagany' }, { status: 400 })
    }

    // Sprawdź czy kurs istnieje
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: 'Kurs nie istnieje' }, { status: 404 })
    }

    // Utwórz nową lekcję
    const { data: lesson, error } = await supabase
      .from('lessons')
      .insert({
        course_id: courseId,
        title,
        description,
        content,
        order_number: order_number || 0,
        wtl_lesson_id: `local-${Date.now()}`,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      console.error('Błąd tworzenia lekcji:', error)
      return NextResponse.json({ error: 'Błąd tworzenia lekcji' }, { status: 500 })
    }

    return NextResponse.json({ lesson, message: 'Lekcja została utworzona pomyślnie' })
  } catch (error) {
    console.error('Błąd API lessons POST:', error)
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}
