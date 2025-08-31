import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import wtlClient from '@/lib/wtl-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { courseId } = await request.json()
    
    if (!courseId) {
      return NextResponse.json(
        { error: 'Brak courseId w żądaniu' },
        { status: 400 }
      )
    }

    console.log('🔍 Debugowanie synchronizacji lekcji dla kursu:', courseId)

    // Pobierz dane kursu
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, wtl_course_id, title')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Kurs nie został znaleziony' },
        { status: 404 }
      )
    }

    console.log(`📚 Debuguję kurs: ${course.title} (WTL ID: ${course.wtl_course_id})`)

    interface EndpointInfo {
      endpoint: string
      status: number | string
      statusText: string
      hasData: boolean
      dataType: string
      isArray: boolean
      dataLength: number | string
      sampleData: string
    }

    interface SampleLessonFields {
      available_fields: string[]
      id_field: string | number
      title_field: string
      description_field: string
      order_field: string | number
    }

    interface DebugInfo {
      course: { id: any; title: any; wtl_course_id: any }
      wtl_api: { base_url: string | undefined; has_api_key: boolean; api_key_length: number }
      endpoints_tested: EndpointInfo[]
      lessons_found: number
      lessons_synced: number
      errors: string[]
      sample_lesson_fields?: SampleLessonFields
    }

    const debugInfo: DebugInfo = {
      course: {
        id: course.id,
        title: course.title,
        wtl_course_id: course.wtl_course_id
      },
      wtl_api: {
        base_url: process.env.WTL_API_URL,
        has_api_key: !!process.env.WTL_API_KEY,
        api_key_length: process.env.WTL_API_KEY?.length || 0
      },
      endpoints_tested: [] as EndpointInfo[],
      lessons_found: 0,
      lessons_synced: 0,
      errors: [] as string[]
    }

    // Testuj różne endpointy WTL API
    const endpoints = [
      `/lesson/list?training_id=${course.wtl_course_id}&range=[0,1000]`,
      `/lesson/list?range=[0,1000]&filter=[{"field": "training_id", "type": "equals", "value": "${course.wtl_course_id}"}]&sort=["order", "ASC"]`,
      `/training/${course.wtl_course_id}/lesson/list?range=[0,1000]&sort=["order", "ASC"]`,
      `/lesson/list?training_id=${course.wtl_course_id}`,
      `/training/${course.wtl_course_id}/lessons`
    ]

    for (const endpoint of endpoints) {
      try {
        console.log(`🌐 Testuję endpoint: ${endpoint}`)
        const wtlResponse = await wtlClient.get(endpoint)
        
        const endpointInfo = {
          endpoint,
          status: wtlResponse.status,
          statusText: wtlResponse.statusText,
          hasData: !!wtlResponse.data,
          dataType: typeof wtlResponse.data,
          isArray: Array.isArray(wtlResponse.data),
          dataLength: Array.isArray(wtlResponse.data) ? wtlResponse.data.length : 'N/A',
          sampleData: ''
        }

        if (wtlResponse.status === 200 && wtlResponse.data) {
          let lessons = wtlResponse.data
          
          // Obsłuż różne formaty odpowiedzi
          if (wtlResponse.data?.data) {
            lessons = wtlResponse.data.data
            endpointInfo.sampleData = `Dane w response.data.data (${Array.isArray(lessons) ? lessons.length : 'nie array'})`
          } else if (wtlResponse.data?.lessons) {
            lessons = wtlResponse.data.lessons
            endpointInfo.sampleData = `Dane w response.data.lessons (${Array.isArray(lessons) ? lessons.length : 'nie array'})`
          } else if (wtlResponse.data?.items) {
            lessons = wtlResponse.data.items
            endpointInfo.sampleData = `Dane w response.data.items (${Array.isArray(lessons) ? lessons.length : 'nie array'})`
          } else {
            endpointInfo.sampleData = `Dane bezpośrednio w response.data (${Array.isArray(lessons) ? lessons.length : 'nie array'})`
          }

          if (Array.isArray(lessons) && lessons.length > 0) {
            endpointInfo.sampleData += ` - Przykład: ${JSON.stringify(lessons[0]).substring(0, 200)}...`
            debugInfo.lessons_found = Math.max(debugInfo.lessons_found, lessons.length)
          }
        }

        debugInfo.endpoints_tested.push(endpointInfo)
        
                 // Jeśli znaleźliśmy lekcje, zatrzymaj testowanie
         if (endpointInfo.status === 200 && endpointInfo.isArray && typeof endpointInfo.dataLength === 'number' && endpointInfo.dataLength > 0) {
           console.log(`✅ Endpoint ${endpoint} zwrócił ${endpointInfo.dataLength} lekcji`)
           break
         }
        
      } catch (error: any) {
        console.error(`❌ Błąd dla endpointu ${endpoint}:`, error)
        debugInfo.endpoints_tested.push({
          endpoint,
          status: 'ERROR',
          statusText: error.message,
          hasData: false,
          dataType: 'error',
          isArray: false,
          dataLength: 'N/A',
          sampleData: `Błąd: ${error.message}`
        })
      }
    }

    // Sprawdź lekcje w bazie danych
    const { data: dbLessons, error: dbError } = await supabase
      .from('lessons')
      .select('id, wtl_lesson_id, title, order_number, status, created_at')
      .eq('course_id', courseId)
      .order('order_number', { ascending: true })

    if (dbError) {
      debugInfo.errors.push(`Błąd bazy danych: ${dbError.message}`)
    } else {
      debugInfo.lessons_synced = dbLessons?.length || 0
    }

    // Sprawdź czy są jakieś problemy z mapowaniem pól
    if (debugInfo.lessons_found > 0) {
             const workingEndpoint = debugInfo.endpoints_tested.find(e => e.status === 200 && e.isArray && typeof e.dataLength === 'number' && e.dataLength > 0)
      if (workingEndpoint) {
        try {
          const response = await wtlClient.get(workingEndpoint.endpoint)
          let lessons = response.data
          
          if (response.data?.data) lessons = response.data.data
          else if (response.data?.lessons) lessons = response.data.lessons
          else if (response.data?.items) lessons = response.data.items
          
          if (Array.isArray(lessons) && lessons.length > 0) {
            const sampleLesson = lessons[0]
            debugInfo.sample_lesson_fields = {
              available_fields: Object.keys(sampleLesson),
              id_field: sampleLesson.id || sampleLesson.lesson_id || sampleLesson.lessonId || 'BRAK',
              title_field: sampleLesson.title || sampleLesson.name || sampleLesson.lesson_name || 'BRAK',
              description_field: sampleLesson.description || sampleLesson.summary || sampleLesson.content_summary || 'BRAK',
              order_field: sampleLesson.order_number || sampleLesson.order || sampleLesson.position || sampleLesson.sequence || 'BRAK'
            }
          }
        } catch (error) {
          debugInfo.errors.push(`Błąd analizy pól: ${error}`)
        }
      }
    }

    console.log('🔍 Debugowanie zakończone:', debugInfo)
    
    return NextResponse.json({
      success: true,
      debug_info: debugInfo,
      recommendations: generateRecommendations(debugInfo)
    })

  } catch (error) {
    console.error('❌ Błąd debugowania:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Wystąpił nieoczekiwany błąd podczas debugowania',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    )
  }
}

function generateRecommendations(debugInfo: any): string[] {
  const recommendations = []
  
  if (!debugInfo.wtl_api.has_api_key) {
    recommendations.push('❌ BRAK WTL_API_KEY - ustaw zmienną środowiskową')
  }
  
  if (debugInfo.lessons_found === 0) {
    recommendations.push('❌ Nie znaleziono lekcji w WTL API - sprawdź endpointy i training_id')
  }
  
  if (debugInfo.lessons_found > 0 && debugInfo.lessons_synced === 0) {
    recommendations.push('⚠️ Znaleziono lekcje w WTL API, ale nie zsynchronizowano - sprawdź mapowanie pól')
  }
  
  if (debugInfo.lessons_found > debugInfo.lessons_synced) {
    recommendations.push('⚠️ Nie wszystkie lekcje zostały zsynchronizowane - sprawdź filtry i mapowanie')
  }
  
     const workingEndpoints = debugInfo.endpoints_tested.filter((e: any) => e.status === 200 && e.isArray && typeof e.dataLength === 'number' && e.dataLength > 0)
  if (workingEndpoints.length === 0) {
    recommendations.push('❌ Żaden endpoint WTL API nie zwrócił poprawnych danych')
  } else if (workingEndpoints.length > 1) {
    recommendations.push('ℹ️ Wiele endpointów działa - użyj pierwszego działającego')
  }
  
  return recommendations
}
