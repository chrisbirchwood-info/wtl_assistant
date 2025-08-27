import { NextRequest, NextResponse } from 'next/server'
import { courseSyncService } from '@/lib/course-sync-service'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Rozpoczynam synchronizację kursów...')
    
    const result = await courseSyncService.syncAllCourses()
    
    if (result.success) {
      console.log('✅ Synchronizacja zakończona pomyślnie')
      return NextResponse.json({
        success: true,
        message: 'Synchronizacja zakończona pomyślnie',
        result
      })
    } else {
      console.error('❌ Synchronizacja zakończona z błędami')
      return NextResponse.json({
        success: false,
        message: 'Synchronizacja zakończona z błędami',
        result
      }, { status: 400 })
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas synchronizacji:', error)
    return NextResponse.json({
      success: false,
      message: 'Wystąpił błąd podczas synchronizacji',
      error: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    console.log('📊 Pobieram statystyki synchronizacji...')
    
    const stats = await courseSyncService.getSyncStats()
    
    return NextResponse.json({
      success: true,
      stats
    })
    
  } catch (error) {
    console.error('❌ Błąd podczas pobierania statystyk:', error)
    return NextResponse.json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania statystyk',
      error: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 })
  }
}
