import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import wtlClient from '@/lib/wtl-client'

// Mock data for development - różne lekcje dla różnych kursów
const mockLessonsData: { [key: string]: any[] } = {
  '1': [
    { id: '1', training_id: '1', name: 'Wprowadzenie do przykładowego szkolenia', order: 1, duration: '15 min', type: 'video', status: 'published' },
    { id: '2', training_id: '1', name: 'Podstawy teoretyczne', order: 2, duration: '25 min', type: 'text', status: 'published' },
    { id: '3', training_id: '1', name: 'Test końcowy', order: 3, duration: '10 min', type: 'quiz', status: 'published' }
  ],
  '2': [
    { id: '4', training_id: '2', name: 'Dzień 1: Przełamywanie barier mentalnych', order: 1, duration: '20 min', type: 'video', status: 'published' },
    { id: '5', training_id: '2', name: 'Dzień 2: Techniki mówienia', order: 2, duration: '30 min', type: 'video', status: 'published' },
    { id: '6', training_id: '2', name: 'Dzień 3: Praktyczne ćwiczenia', order: 3, duration: '25 min', type: 'exercise', status: 'published' },
    { id: '7', training_id: '2', name: 'Dzień 4: Konwersacje', order: 4, duration: '35 min', type: 'video', status: 'published' },
    { id: '8', training_id: '2', name: 'Dzień 5: Podsumowanie i test', order: 5, duration: '15 min', type: 'quiz', status: 'published' }
  ],
  '3': [
    { id: '9', training_id: '3', name: 'AI w nauce języków', order: 1, duration: '40 min', type: 'video', status: 'published' },
    { id: '10', training_id: '3', name: 'Techniki pamięciowe', order: 2, duration: '35 min', type: 'video', status: 'published' },
    { id: '11', training_id: '3', name: 'Praktyczne zastosowanie AI', order: 3, duration: '45 min', type: 'exercise', status: 'published' },
    { id: '12', training_id: '3', name: 'Budowanie pewności siebie', order: 4, duration: '30 min', type: 'video', status: 'published' }
  ]
}

const getAllMockLessons = () => {
  return Object.values(mockLessonsData).flat()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const trainingId = searchParams.get('trainingId')

    console.log('Fetching lessons...', courseId ? `for course ${courseId}` : trainingId ? `for training ${trainingId}` : 'all lessons')

    // Najpierw spróbuj pobrać z bazy danych (jeśli mamy courseId)
    // Use service role client for consistent server-side access (bypasses RLS for writes/reads)
    const srvSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (courseId) {
      const { data: dbLessons, error: dbError } = await srvSupabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .eq('status', 'active')
        .order('order_number', { ascending: true })

      if (!dbError && dbLessons && dbLessons.length > 0) {
        console.log('Using lessons from database:', dbLessons.length, 'lessons')
        return NextResponse.json({
          success: true,
          lessons: dbLessons,
          source: 'database',
          message: 'Lessons loaded from database'
        })
      }
    }

    // Jeśli nie ma lekcji w bazie, spróbuj WTL API
    const wtlResponse = await wtlClient.getLessons(trainingId || undefined)
    if (wtlResponse.success && wtlResponse.data && wtlResponse.data.length > 0) {
      console.log('Successfully fetched from WTL API:', wtlResponse.data.length, 'lessons')
      
      // Synchronizuj lekcje z WTL do bazy danych
      if (courseId) {
        try {
          const nowIso = new Date().toISOString()
          const lessonsToSync = wtlResponse.data.map((lesson: any) => {
            // Mapuj różne możliwe pola z WTL API
            const lessonId = lesson.id || lesson.lesson_id || lesson.lessonId
            const lessonTitle = lesson.name || lesson.title || lesson.lesson_name
            const lessonDescription = lesson.description || lesson.summary || lesson.content_summary
            const lessonContent = lesson.content || lesson.lesson_content || lesson.text || ''
            const lessonOrder = lesson.order_number || lesson.order || lesson.position || lesson.sequence || 1
            
            return {
              wtl_lesson_id: lessonId.toString(),
              course_id: courseId,
              title: lessonTitle,
              description: lessonDescription || null,
              content: lessonContent || null,
              order_number: lessonOrder,
              status: 'active',
              last_sync_at: nowIso
            }
          })

          const { error: syncError } = await srvSupabase
            .from('lessons')
            .upsert(lessonsToSync, { onConflict: 'wtl_lesson_id', ignoreDuplicates: false })

          if (syncError) {
            console.log('Failed to sync lessons to database:', syncError)
          } else {
            console.log('Synced lessons to database')
          }
        } catch (syncError) {
          console.log('Failed to sync lessons to database:', syncError)
        }
      }

      return NextResponse.json({
        success: true,
        lessons: wtlResponse.data,
        source: 'wtl',
        message: 'Lessons loaded from Web To Learn API'
      })
    }

    console.log('WTL API failed, using mock data')

    // Fallback do mock danych
    const mockLessons = courseId ? mockLessonsData[courseId] || [] : getAllMockLessons()

    return NextResponse.json({
      success: true,
      lessons: mockLessons,
      source: 'mock',
      message: `Using demo lessons - WTL API not available`
    })

  } catch (error) {
    console.error('Lessons API error:', error)
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    
    return NextResponse.json({
      success: true,
      lessons: courseId ? mockLessonsData[courseId] || [] : getAllMockLessons(),
      source: 'mock',
      message: 'Error occurred, using demo lessons'
    })
  }
}

export async function POST(_request: NextRequest) {
  // Synchronizacja lekcji tym endpointem jest wyłączona – użyj panelu admina
  return NextResponse.json(
    { error: 'Lesson sync disabled. Use admin admin/lessons sync.' },
    { status: 405 }
  )
}
