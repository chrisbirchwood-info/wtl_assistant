import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Pobierz wszystkie kursy z bazy danych
    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, title, wtl_course_id, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Błąd pobierania kursów:', error)
      return NextResponse.json(
        { error: 'Błąd pobierania kursów z bazy danych' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      courses: courses || [],
      count: courses?.length || 0
    })

  } catch (error) {
    console.error('Błąd API admin courses:', error)
    return NextResponse.json(
      { error: 'Wystąpił nieoczekiwany błąd' },
      { status: 500 }
    )
  }
}
