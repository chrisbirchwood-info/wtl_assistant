import { NextRequest, NextResponse } from 'next/server'
import { courseSyncService } from '@/lib/course-sync-service'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('📚 Pobieram kursy z lokalnej bazy danych...')
    
    // Sprawdź czy to jest nauczyciel (ma parametr teacherId)
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')
    // Paging params (optional)
    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')
    const hasPaging = !!(pageParam || limitParam)
    const page = Math.max(1, parseInt(pageParam || '1', 10))
    const limitRaw = Math.max(1, parseInt(limitParam || '20', 10))
    const limit = Math.min(100, limitRaw)
    
    let courses: any[] = []
    let total = 0
    
    if (teacherId) {
      // Dla nauczyciela - pobierz tylko kursy do których jest przypisany
      console.log(`👥 Pobieram kursy dla nauczyciela ${teacherId}...`)
      
      const start = (page - 1) * limit
      const end = start + limit - 1
      const { data: courseTeachers, error: ctError, count } = await supabase
        .from('course_teachers')
        .select(`
          course_id,
          role,
          assigned_at,
          course:courses(
            *,
            teacher:users(username, email)
          )
        `, { count: hasPaging ? 'exact' : undefined })
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
        .eq('course.status', 'active')
        .order('assigned_at', { ascending: false })
        .range(hasPaging ? start : 0, hasPaging ? end : 100000)
      
      if (ctError) {
        console.error('❌ Błąd pobierania przypisań kursów:', ctError)
        throw ctError
      }
      
      // Mapuj dane z course_teachers na kursy
      courses = courseTeachers?.map(ct => ({
        ...ct.course,
        teacher_role: ct.role, // Dodaj rolę nauczyciela w tym kursie
        assigned_at: ct.assigned_at // Data przypisania
      })) || []
      total = count ?? courses.length

      console.log(`✅ Pobrano ${courses.length} kursów dla nauczyciela ${teacherId}`)
    } else {
      // Dla admina - pobierz wszystkie kursy
      console.log('👑 Pobieram wszystkie kursy (admin)...')
      courses = await courseSyncService.getLocalCourses('active')
      console.log(`✅ Pobrano ${courses.length} wszystkich kursów`)
    }
    
    return NextResponse.json({
      success: true,
      courses
    })
    
  } catch (error) {
    console.error('❌ Błąd podczas pobierania kursów:', error)
    return NextResponse.json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania kursów',
      error: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 })
  }
}
