import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Pobierz wszystkie lekcje z bazy danych
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .order('created_at', { ascending: false })
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

  } catch (error) {
    console.error('Błąd API admin lessons:', error)
    return NextResponse.json(
      { error: 'Wystąpił nieoczekiwany błąd' },
      { status: 500 }
    )
  }
}














