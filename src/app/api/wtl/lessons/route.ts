import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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
    if (courseId) {
      const { data: dbLessons, error: dbError } = await supabase
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
          const lessonsToSync = wtlResponse.data.map((lesson: any) => {
            // Mapuj różne możliwe pola z WTL API
            const lessonId = lesson.id || lesson.lesson_id || lesson.lessonId
            const lessonTitle = lesson.title || lesson.name || lesson.lesson_name
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
              status: 'active'
            }
          })

          const { error: syncError } = await supabase
            .from('lessons')
            .upsert(lessonsToSync, { onConflict: 'wtl_lesson_id' })

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

    console.log('Synchronizing lessons for course:', courseId)

    // Pobierz lekcje z WTL API
    const wtlResponse = await wtlClient.getLessons(courseId)
    if (!wtlResponse.success || !wtlResponse.data) {
      return NextResponse.json(
        { error: 'Nie udało się pobrać lekcji z WTL API' },
        { status: 500 }
      )
    }

    // Synchronizuj lekcje do bazy danych
    const lessonsToSync = wtlResponse.data.map((lesson: any) => {
      // Mapuj różne możliwe pola z WTL API
      const lessonId = lesson.id || lesson.lesson_id || lesson.lessonId
      const lessonTitle = lesson.title || lesson.name || lesson.lesson_name
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
        status: 'active'
      }
    })

    const { error: syncError } = await supabase
      .from('lessons')
      .upsert(lessonsToSync, { onConflict: 'wtl_lesson_id' })

    if (syncError) {
      console.error('Failed to sync lessons to database:', syncError)
      return NextResponse.json(
        { error: 'Błąd synchronizacji lekcji do bazy danych' },
        { status: 500 }
      )
    }

    console.log('Successfully synced lessons to database')

    // Pobierz zsynchronizowane lekcje z bazy
    const { data: syncedLessons, error: fetchError } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .eq('status', 'active')
      .order('order_number', { ascending: true })

    if (fetchError) {
      console.error('Failed to fetch synced lessons:', fetchError)
      return NextResponse.json(
        { error: 'Błąd pobierania zsynchronizowanych lekcji' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      lessons: syncedLessons || [],
      message: `Synchronized ${lessonsToSync.length} lessons from WTL API`,
      synced_count: lessonsToSync.length
    })

  } catch (error) {
    console.error('Lesson sync error:', error)
    return NextResponse.json(
      { error: 'Wystąpił nieoczekiwany błąd podczas synchronizacji' },
      { status: 500 }
    )
  }
}
