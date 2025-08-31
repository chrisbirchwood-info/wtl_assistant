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
      // Pobierz lekcje dla danego kursu
      const { data: lessons, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .eq('status', 'active')
        .order('order_number', { ascending: true })
        .limit(1000) // Pobierz maksymalnie 1000 lekcji

      if (error) {
        console.error('Błąd pobierania lekcji:', error)
        return NextResponse.json(
          { error: 'Błąd pobierania lekcji z bazy danych' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        lessons: lessons || [],
        count: lessons?.length || 0
      })
    } else {
      // Pobierz wszystkie lekcje (dla strony notatek)
      const { data: lessons, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('status', 'active')
        .order('order_number', { ascending: true })
        .limit(1000) // Pobierz maksymalnie 1000 lekcji

      if (error) {
        console.error('Błąd pobierania wszystkich lekcji:', error)
        return NextResponse.json(
          { error: 'Błąd pobierania lekcji z bazy danych' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        lessons: lessons || [],
        count: lessons?.length || 0
      })
    }

  } catch (error) {
    console.error('Błąd API lessons:', error)
    return NextResponse.json(
      { error: 'Wystąpił nieoczekiwany błąd' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    
    if (!courseId) {
      return NextResponse.json(
        { error: 'Brak courseId w parametrach' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { title, description, content, order_number } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Tytuł lekcji jest wymagany' },
        { status: 400 }
      )
    }

    // Sprawdź czy kurs istnieje
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Kurs nie istnieje' },
        { status: 404 }
      )
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
        wtl_lesson_id: `local-${Date.now()}`, // Tymczasowe ID dla lokalnych lekcji
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Błąd tworzenia lekcji:', error)
      return NextResponse.json(
        { error: 'Błąd tworzenia lekcji' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      lesson,
      message: 'Lekcja została utworzona pomyślnie'
    })

  } catch (error) {
    console.error('Błąd API lessons POST:', error)
    return NextResponse.json(
      { error: 'Wystąpił nieoczekiwany błąd' },
      { status: 500 }
    )
  }
}
