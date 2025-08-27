import { NextRequest, NextResponse } from 'next/server'
import { courseSyncService } from '@/lib/course-sync-service'

export async function GET(request: NextRequest) {
  try {
    console.log('📚 Pobieram kursy z lokalnej bazy danych...')
    
    const courses = await courseSyncService.getLocalCourses()
    
    console.log(`✅ Pobrano ${courses.length} kursów z lokalnej bazy`)
    
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
