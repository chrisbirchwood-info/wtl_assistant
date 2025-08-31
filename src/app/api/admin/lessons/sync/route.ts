import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import wtlClient from '@/lib/wtl-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Rozpoczynam synchronizację lekcji z WTL...')

    // Pobierz wszystkie kursy z bazy danych
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, wtl_course_id, title')
      .eq('status', 'active')

    if (coursesError) {
      console.error('❌ Błąd pobierania kursów:', coursesError)
      return NextResponse.json(
        { error: 'Błąd pobierania kursów z bazy danych' },
        { status: 500 }
      )
    }

    if (!courses || courses.length === 0) {
      return NextResponse.json(
        { error: 'Brak kursów do synchronizacji' },
        { status: 400 }
      )
    }

    console.log(`📚 Znaleziono ${courses.length} kursów do synchronizacji`)

    const result = {
      success: true,
      lessons: { created: 0, updated: 0, errors: 0 },
      errors: [] as string[]
    }

    // Synchronizuj lekcje dla każdego kursu
    for (const course of courses) {
      try {
        console.log(`📚 Synchronizuję lekcje dla kursu: ${course.title} (WTL ID: ${course.wtl_course_id})`)

        // Pobierz wszystkie lekcje z WTL API używając różnych endpointów
        let allWtlLessons: any[] = []
        
        // Spróbuj różnych endpointów WTL API
        const endpoints = [
          `/lesson/list?training_id=${course.wtl_course_id}&range=[0,1000]`,
          `/lesson/list?range=[0,1000]&filter=[{"field": "training_id", "type": "equals", "value": "${course.wtl_course_id}"}]&sort=["order", "ASC"]`,
          `/training/${course.wtl_course_id}/lesson/list?range=[0,1000]&sort=["order", "ASC"]`
        ]
        
        for (const endpoint of endpoints) {
          try {
            console.log(`🌐 Próbuję endpoint: ${endpoint}`)
            const wtlResponse = await wtlClient.get(endpoint)
            
            if (wtlResponse.status === 200 && wtlResponse.data) {
              let lessons = wtlResponse.data
              
              // Obsłuż różne formaty odpowiedzi
              if (wtlResponse.data?.data) {
                lessons = wtlResponse.data.data
              } else if (wtlResponse.data?.lessons) {
                lessons = wtlResponse.data.lessons
              } else if (wtlResponse.data?.items) {
                lessons = wtlResponse.data.items
              }
              
              // Upewnij się że to jest array
              if (Array.isArray(lessons)) {
                allWtlLessons = lessons
                console.log(`✅ Pobrano ${lessons.length} lekcji z endpointu: ${endpoint}`)
                break // Użyj pierwszego działającego endpointu
              } else {
                console.log(`⚠️ Endpoint ${endpoint} zwrócił nieprawidłowy format danych:`, typeof lessons)
              }
            } else {
              console.log(`⚠️ Endpoint ${endpoint} zwrócił status: ${wtlResponse.status}`)
            }
          } catch (error) {
            console.log(`❌ Błąd dla endpointu ${endpoint}:`, error)
            continue
          }
        }
        
        // Jeśli żaden endpoint nie zadziałał, spróbuj z paginacją
        if (allWtlLessons.length === 0) {
          console.log(`🔄 Próbuję pobrać lekcje z paginacją...`)
          let offset = 0
          const limit = 100
          let hasMoreLessons = true
          
          while (hasMoreLessons) {
            try {
              const wtlResponse = await wtlClient.get(`/lesson/list?training_id=${course.wtl_course_id}&range=[${offset},${limit}]`)
              
              if (wtlResponse.status === 200 && wtlResponse.data) {
                let lessons = wtlResponse.data
                
                // Obsłuż różne formaty odpowiedzi
                if (wtlResponse.data?.data) {
                  lessons = wtlResponse.data.data
                } else if (wtlResponse.data?.lessons) {
                  lessons = wtlResponse.data.lessons
                } else if (wtlResponse.data?.items) {
                  lessons = wtlResponse.data.items
                }
                
                if (Array.isArray(lessons)) {
                  allWtlLessons = allWtlLessons.concat(lessons)
                  console.log(`📚 Pobrano ${lessons.length} lekcji z offset=${offset} (łącznie: ${allWtlLessons.length})`)
                  
                  // Sprawdź czy to była ostatnia partia
                  if (lessons.length < limit) {
                    hasMoreLessons = false
                  } else {
                    offset += limit
                  }
                  
                  // Dodaj małe opóźnienie żeby nie przeciążyć API
                  await new Promise(resolve => setTimeout(resolve, 100))
                } else {
                  console.log(`⚠️ Nieprawidłowy format danych z paginacji:`, typeof lessons)
                  break
                }
              } else {
                console.log(`⚠️ Błąd paginacji dla offset=${offset}: status ${wtlResponse.status}`)
                break
              }
            } catch (error) {
              console.error(`❌ Błąd pobierania lekcji z offset=${offset}:`, error)
              break
            }
          }
        }

        console.log(`📚 Pobrano łącznie ${allWtlLessons.length} lekcji z WTL API dla kursu ${course.title}`)

        if (allWtlLessons.length === 0) {
          console.log(`ℹ️ Brak lekcji do synchronizacji dla kursu ${course.title}`)
          continue
        }

        // Przygotuj lekcje do synchronizacji
        const lessonsToSync = allWtlLessons
          .filter((wtlLesson: any) => {
            // Filtruj lekcje bez ID - sprawdź różne możliwe pola ID
            const lessonId = wtlLesson.id || wtlLesson.lesson_id || wtlLesson.lessonId
            if (!lessonId) {
              console.log(`⚠️ Pomijam lekcję bez ID:`, wtlLesson)
              return false
            }
            
            // Sprawdź różne możliwe pola tytułu
            const lessonTitle = wtlLesson.title || wtlLesson.name || wtlLesson.lesson_name
            if (!lessonTitle) {
              console.log(`⚠️ Pomijam lekcję bez tytułu (ID: ${lessonId}):`, wtlLesson)
              return false
            }
            
            return true
          })
          .map((wtlLesson: any) => {
            // Mapuj różne możliwe pola z WTL API
            const lessonId = wtlLesson.id || wtlLesson.lesson_id || wtlLesson.lessonId
            const lessonTitle = wtlLesson.title || wtlLesson.name || wtlLesson.lesson_name
            const lessonDescription = wtlLesson.description || wtlLesson.summary || wtlLesson.content_summary
            const lessonContent = wtlLesson.content || wtlLesson.lesson_content || wtlLesson.text || ''
            const lessonOrder = wtlLesson.order_number || wtlLesson.order || wtlLesson.position || wtlLesson.sequence || 0
            
            return {
              wtl_lesson_id: lessonId.toString(),
              course_id: course.id,
              title: lessonTitle,
              description: lessonDescription || null,
              content: lessonContent || null,
              order_number: lessonOrder,
              status: 'active',
              last_sync_at: new Date().toISOString()
            }
          })

        // Synchronizuj lekcje używając prawdziwego upsert
        for (const lessonData of lessonsToSync) {
          try {
            // Użyj upsert z onConflict na wtl_lesson_id
            const { error: upsertError } = await supabase
              .from('lessons')
              .upsert(lessonData, {
                onConflict: 'wtl_lesson_id',
                ignoreDuplicates: false
              })

            if (upsertError) {
              console.error(`❌ Błąd upsert lekcji ${lessonData.title}:`, upsertError)
              result.lessons.errors++
              result.errors.push(`Upsert lekcji ${lessonData.title}: ${upsertError.message}`)
            } else {
              // Sprawdź czy to była aktualizacja czy nowa lekcja
              const { data: existingLesson } = await supabase
                .from('lessons')
                .select('id, created_at')
                .eq('wtl_lesson_id', lessonData.wtl_lesson_id)
                .single()

              if (existingLesson) {
                // Sprawdź czy lekcja została właśnie utworzona (w tym samym czasie)
                const lessonCreatedAt = new Date(existingLesson.created_at)
                const now = new Date()
                const timeDiff = Math.abs(now.getTime() - lessonCreatedAt.getTime())
                
                if (timeDiff < 1000) { // Mniej niż 1 sekunda = nowa lekcja
                  result.lessons.created++
                  console.log(`✅ Utworzono lekcję: ${lessonData.title}`)
                } else {
                  result.lessons.updated++
                  console.log(`✅ Zaktualizowano lekcję: ${lessonData.title}`)
                }
              }
            }
          } catch (lessonError) {
            console.error(`❌ Błąd synchronizacji lekcji ${lessonData.title}:`, lessonError)
            result.lessons.errors++
            result.errors.push(`Lekcja ${lessonData.title}: ${lessonError}`)
          }
        }

        console.log(`✅ Zakończono synchronizację lekcji dla kursu: ${course.title}`)

      } catch (courseError) {
        console.error(`❌ Błąd synchronizacji lekcji dla kursu ${course.title}:`, courseError)
        result.errors.push(`Kurs ${course.title}: ${courseError}`)
      }
    }

    console.log(`🎉 Synchronizacja lekcji zakończona!`)
    console.log(`📊 Statystyki: ${result.lessons.created} utworzonych, ${result.lessons.updated} zaktualizowanych, ${result.lessons.errors} błędów`)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Błąd synchronizacji lekcji:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Wystąpił nieoczekiwany błąd podczas synchronizacji',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Pobierz wszystkie lekcje z bazy danych
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)

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
    console.error('Błąd API admin lessons sync GET:', error)
    return NextResponse.json(
      { error: 'Wystąpił nieoczekiwany błąd' },
      { status: 500 }
    )
  }
}
