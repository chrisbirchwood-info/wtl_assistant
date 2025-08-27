import { NextRequest, NextResponse } from 'next/server'
import { courseSyncService } from '@/lib/course-sync-service'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params
    console.log(`👥 Pobieram studentów dla kursu ${courseId} z lokalnej bazy...`)
    
    const students = await courseSyncService.getLocalCourseStudents(courseId)
    
    console.log(`✅ Pobrano ${students.length} studentów z lokalnej bazy`)
    
    return NextResponse.json({
      success: true,
      students
    })
    
  } catch (error) {
    console.error('❌ Błąd podczas pobierania studentów:', error)
    return NextResponse.json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania studentów',
      error: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params
    console.log(`🔄 Synchronizuję studentów dla kursu ${courseId}...`)
    
    const result = await courseSyncService.syncCourseStudents(courseId)
    
    if (result.success) {
      console.log('✅ Synchronizacja studentów zakończona pomyślnie')
      return NextResponse.json({
        success: true,
        message: 'Synchronizacja studentów zakończona pomyślnie',
        result
      })
    } else {
      console.error('❌ Synchronizacja studentów zakończona z błędami')
      return NextResponse.json({
        success: false,
        message: 'Synchronizacja studentów zakończona z błędami',
        result
      }, { status: 400 })
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas synchronizacji studentów:', error)
    return NextResponse.json({
      success: false,
      message: 'Wystąpił błąd podczas synchronizacji studentów',
      error: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 })
  }
}
