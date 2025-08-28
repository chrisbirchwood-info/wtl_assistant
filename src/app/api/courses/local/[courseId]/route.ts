import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Pobierz pojedynczy kurs po ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params
    
    console.log(`📚 Pobieram kurs ${courseId}...`)
    
    const { data: course, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()

    if (error) {
      console.error('❌ Błąd pobierania kursu:', error)
      return NextResponse.json({
        success: false,
        message: 'Wystąpił błąd podczas pobierania kursu',
        error: error.message
      }, { status: 500 })
    }

    if (!course) {
      return NextResponse.json({
        success: false,
        message: 'Kurs nie istnieje'
      }, { status: 404 })
    }

    console.log(`✅ Pobrano kurs: ${course.title}`)
    
    return NextResponse.json({
      success: true,
      course
    })
    
  } catch (error) {
    console.error('❌ Błąd podczas pobierania kursu:', error)
    return NextResponse.json({
      success: false,
      message: 'Wystąpił nieoczekiwany błąd',
      error: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 })
  }
}
