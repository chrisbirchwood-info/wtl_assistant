/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
import { createClient } from '@supabase/supabase-js'
import wtlClient from '@/lib/wtl-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    console.log('>> Rozpoczynam synchronizację lekcji z WTL...')

    // Pobierz wszystkie kursy z bazy danych
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, wtl_course_id, title')
      .eq('status', 'active')

    if (coursesError) {
      console.error('Błąd pobierania kursów:', coursesError)
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

    console.log(`Znaleziono ${courses.length} kursów do synchronizacji`)

    const result = {
      success: true,
      lessons: { created: 0, updated: 0, errors: 0 },
      errors: [] as string[],
    }

    // 1) Wybierz działający wzorzec endpointu tylko raz, aby uniknąć długich timeoutów per kurs
    const endpointTemplates: Array<(id: string | number) => string> = [
      (id) => `/lesson/list?training_id=${id}&range=[0,1000]`,
      (id) => `/lesson/list?range=[0,1000]&filter=[{"field": "training_id", "type": "equals", "value": "${id}"}]&sort=["order", "ASC"]`,
      (id) => `/training/${id}/lesson/list?range=[0,1000]&sort=["order", "ASC"]`,
    ]

    let buildEndpointForId: ((id: string | number) => string) | null = null
    try {
      const sample = courses[0]
      for (const tmpl of endpointTemplates) {
        const testUrl = tmpl(sample.wtl_course_id)
        try {
          console.log(`-> Testuję endpoint lekcji: ${testUrl}`)
          const testResp = await wtlClient.get(testUrl, { timeout: 10000 })
          const lessons = testResp?.data?.data ?? testResp?.data?.lessons ?? testResp?.data?.items ?? testResp?.data
          if (testResp?.status === 200 && Array.isArray(lessons)) {
            buildEndpointForId = tmpl
            console.log(`✅ Wybrano działający endpoint: ${testUrl}`)
            break
          }
        } catch {
          // ignoruj błędy prób
        }
      }
      if (!buildEndpointForId) {
        console.log('⚠️ Nie wybrano działającego endpointu wstępnie – użyję fallbacku i paginacji')
      }
    } catch {}

    // 2) Funkcja przetwarzająca jeden kurs
    async function processCourse(course: any) {
      try {
        console.log(`-> Synchronizuję lekcje dla kursu: ${course.title} (WTL ID: ${course.wtl_course_id})`)

        // Pobierz wszystkie lekcje z WTL API
        let allWtlLessons: any[] = []

        // a) Najpierw spróbuj wcześniej wybranego endpointu
        if (buildEndpointForId) {
          try {
            const endpoint = buildEndpointForId(course.wtl_course_id)
            const wtlResponse = await wtlClient.get(endpoint, { timeout: 5000 })
            if (wtlResponse?.status === 200 && wtlResponse?.data) {
              const lessons = wtlResponse.data?.data ?? wtlResponse.data?.lessons ?? wtlResponse.data?.items ?? wtlResponse.data
              if (Array.isArray(lessons)) {
                allWtlLessons = lessons
              }
            }
          } catch {}
        }

        // b) Jeśli nadal brak danych – spróbuj pozostałych endpointów z krótkim timeoutem
        if (allWtlLessons.length === 0) {
          const legacyEndpoints = [
            `/lesson/list?training_id=${course.wtl_course_id}&range=[0,1000]`,
            `/lesson/list?range=[0,1000]&filter=[{"field": "training_id", "type": "equals", "value": "${course.wtl_course_id}"}]&sort=["order", "ASC"]`,
            `/training/${course.wtl_course_id}/lesson/list?range=[0,1000]&sort=["order", "ASC"]`,
          ]
          for (const endpoint of legacyEndpoints) {
            try {
              const wtlResponse = await wtlClient.get(endpoint, { timeout: 5000 })
              const lessons = wtlResponse?.data?.data ?? wtlResponse?.data?.lessons ?? wtlResponse?.data?.items ?? wtlResponse?.data
              if (wtlResponse?.status === 200 && Array.isArray(lessons)) {
                allWtlLessons = lessons
                break
              }
            } catch {}
          }
        }

        // c) Fallback – paginacja z krótkim timeoutem
        if (allWtlLessons.length === 0) {
          let offset = 0
          const limit = 100
          let hasMoreLessons = true

          while (hasMoreLessons) {
            try {
              const wtlResponse = await wtlClient.get(
                `/lesson/list?training_id=${course.wtl_course_id}&range=[${offset},${limit}]`,
                { timeout: 5000 }
              )

              if (wtlResponse.status === 200 && wtlResponse.data) {
                let lessons = wtlResponse.data
                if (wtlResponse.data?.data) lessons = wtlResponse.data.data
                else if (wtlResponse.data?.lessons) lessons = wtlResponse.data.lessons
                else if (wtlResponse.data?.items) lessons = wtlResponse.data.items

                if (Array.isArray(lessons)) {
                  allWtlLessons = allWtlLessons.concat(lessons)
                  if (lessons.length < limit) {
                    hasMoreLessons = false
                  } else {
                    offset += limit
                  }
                  // drobna pauza, by nie przeciążyć API
                  await new Promise((resolve) => setTimeout(resolve, 50))
                } else {
                  break
                }
              } else {
                break
              }
            } catch {
              break
            }
          }
        }

        console.log(`Pobrano łącznie ${allWtlLessons.length} lekcji z WTL API dla kursu ${course.title}`)
        if (allWtlLessons.length === 0) {
          console.log(`Brak lekcji do synchronizacji dla kursu ${course.title}`)
          return
        }

        // Przygotuj lekcje do synchronizacji
        const lessonsToSync = allWtlLessons
          .filter((wtlLesson: any) => {
            const lessonId = wtlLesson.id || wtlLesson.lesson_id || wtlLesson.lessonId
            if (!lessonId) return false
            const lessonTitle = wtlLesson.title || wtlLesson.name || wtlLesson.lesson_name
            if (!lessonTitle) return false
            return true
          })
          .map((wtlLesson: any) => {
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
              last_sync_at: new Date().toISOString(),
            }
          })

        // Upsert lekcji (sekwencyjnie, ale bez niepotrzebnych odczytów)
        for (const lessonData of lessonsToSync) {
          try {
            const { error: upsertError } = await supabase
              .from('lessons')
              .upsert(lessonData, {
                onConflict: 'wtl_lesson_id',
                ignoreDuplicates: false,
              })
            if (upsertError) {
              console.error(`Błąd upsert lekcji ${lessonData.title}:`, upsertError)
              result.lessons.errors++
              result.errors.push(`Upsert lekcji ${lessonData.title}: ${upsertError.message}`)
            } else {
              // Prostszą heurystyką: licz aktualizacje/nowe po braku id (pomijamy dodatkowy SELECT)
              // Tu zakładamy, że brak błędu = sukces, nie rozróżniamy created/updated
              result.lessons.updated++
            }
          } catch (lessonError) {
            console.error(`Błąd synchronizacji lekcji ${lessonData.title}:`, lessonError)
            result.lessons.errors++
            result.errors.push(`Lekcja ${lessonData.title}: ${lessonError}`)
          }
        }
        console.log(`Zakończono synchronizację lekcji dla kursu: ${course.title}`)
      } catch (courseError) {
        console.error(`Błąd synchronizacji lekcji dla kursu ${course.title}:`, courseError)
        result.errors.push(`Kurs ${course.title}: ${courseError}`)
      }
    }

    // 3) Uruchom przetwarzanie równolegle z limitem współbieżności
    const concurrency = 2
    const queue = [...(courses as any[])]
    const workers: Promise<void>[] = []
    for (let i = 0; i < concurrency; i++) {
      workers.push((async () => {
        while (queue.length) {
          const next = queue.shift()
          if (!next) break
          await processCourse(next)
        }
      })())
    }
    await Promise.all(workers)

    console.log('Synchronizacja lekcji zakończona!')
    console.log(
      `Statystyki: ${result.lessons.created} utworzonych, ${result.lessons.updated} zaktualizowanych, ${result.lessons.errors} błędów`
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Błąd synchronizacji lekcji:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Wystąpił nieoczekiwany błąd podczas synchronizacji',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
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

    return NextResponse.json({ lessons: lessons || [], count: lessons?.length || 0 })
  } catch (error) {
    console.error('Błąd API admin lessons sync GET:', error)
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}
