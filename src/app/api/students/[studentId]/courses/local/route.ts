/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { courseSyncService } from '@/lib/course-sync-service'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await context.params
    console.log(`📚 Pobieram kursy dla studenta ${studentId} z lokalnej bazy...`)

    const enrollments = await courseSyncService.getLocalStudentCourses(studentId)

    const courses = (enrollments || [])
      .map((e: any) => e.course)
      .filter(Boolean)

    console.log(`✅ Pobrano ${courses.length} kursów dla studenta z lokalnej bazy`)

    return NextResponse.json({
      success: true,
      courses
    })

  } catch (error) {
    console.error('❌ Błąd podczas pobierania kursów dla studenta:', error)
    return NextResponse.json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania kursów dla studenta',
      error: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 })
  }
}
