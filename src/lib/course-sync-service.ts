import { createClient } from '@supabase/supabase-js'
import { wtlClient } from './wtl-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface WTLTraining {
  id: string
  name: string
  description?: string
}

export interface WTLStudent {
  id: string
  email: string
  name?: string
  first_name?: string
  last_name?: string
  expired_at?: string
}

export interface SyncResult {
  success: boolean
  courses: {
    created: number
    updated: number
    errors: number
  }
  students: {
    created: number
    updated: number
    errors: number
  }
  enrollments: {
    created: number
    updated: number
    errors: number
  }
  lessons: {
    created: number
    updated: number
    errors: number
  }
  errors: string[]
}

export class CourseSyncService {
  /**
   * Synchronizuje wszystkie kursy z WTL API
   */
  async syncAllCourses(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      courses: { created: 0, updated: 0, errors: 0 },
      students: { created: 0, updated: 0, errors: 0 },
      enrollments: { created: 0, updated: 0, errors: 0 },
      lessons: { created: 0, updated: 0, errors: 0 },
      errors: []
    }

    try {
      console.log('🔄 Rozpoczynam synchronizację wszystkich kursów...')
      
      // Pobierz kursy z WTL API
      const wtlResponse = await wtlClient.get('/training/list?range=[0,1000]&sort=["name", "ASC"]')
      
      if (wtlResponse.status !== 200) {
        throw new Error(`WTL API error: ${wtlResponse.status}`)
      }

      const wtlCourses: WTLTraining[] = wtlResponse.data
      await this.softDeleteMissingCourses(wtlCourses.map(c => String(c.id)))
      console.log(`📚 Pobrano ${wtlCourses.length} kursów z WTL API`)

      // Synchronizuj każdy kurs
      for (const wtlCourse of wtlCourses) {
        try {
          await this.syncCourse(wtlCourse, result)
          // result.courses.created++ (counted inside syncCourse)
        } catch (error) {
          console.error(`❌ Błąd synchronizacji kursu ${wtlCourse.id}:`, error)
          result.courses.errors++
          result.errors.push(`Kurs ${wtlCourse.id}: ${error}`)
        }
      }

      console.log(`✅ Synchronizacja kursów zakończona: ${result.courses.created} utworzonych`)
      
    } catch (error) {
      console.error('❌ Błąd podczas synchronizacji kursów:', error)
      result.success = false
      result.errors.push(`Ogólny błąd: ${error}`)
    }

    return result
  }

  /**
   * Synchronizuje pojedynczy kurs
   */
  private async syncCourse(wtlCourse: WTLTraining, result: SyncResult): Promise<void> {
    // Sprawdź czy kurs już istnieje
    const { data: existingCourse } = await supabase
      .from('courses')
      .select('id, title, description')
      .eq('wtl_course_id', wtlCourse.id)
      .single()

    if (existingCourse) {
      // Aktualizuj istniejący kurs
      await supabase
        .from('courses')
        .update({
          title: wtlCourse.name,
          description: wtlCourse.description || '',
          updated_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          sync_status: 'synced'
        })
        .eq('id', existingCourse.id)

      console.log(`🔄 Zaktualizowano kurs: ${wtlCourse.name}`)
    } else {
      // Utwórz nowy kurs
      await supabase
        .from('courses')
        .insert({
          wtl_course_id: wtlCourse.id,
          title: wtlCourse.name,
          description: wtlCourse.description || '',
          status: 'active',
          max_students: 50,
          created_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          sync_status: 'synced'
        })

      console.log(`✅ Utworzono nowy kurs: ${wtlCourse.name}`)
    }

    // Synchronizuj lekcje dla tego kursu
    try {
      const courseId = existingCourse?.id || ''
      if (courseId) {
        await this.syncCourseLessons(wtlCourse.id, courseId)
        console.log(`📚 Zsynchronizowano lekcje dla kursu: ${wtlCourse.name}`)
        // result.lessons.created++ (deprecated: counted in syncCourseLessons)
      }
    } catch (error) {
      console.error(`❌ Błąd synchronizacji lekcji dla kursu ${wtlCourse.name}:`, error)
      result.lessons.errors++
      result.errors.push(`Lekcje kursu ${wtlCourse.id}: ${error}`)
    }

    // Loguj synchronizację
    await this.logSync('course', wtlCourse.id, 'synced', { name: wtlCourse.name })
  }

  /**
   * Synchronizuje lekcje dla konkretnego kursu
   */
  private async syncCourseLessons(wtlCourseId: string, localCourseId: string): Promise<void> {
    try {
      console.log(`📚 Synchronizuję lekcje dla kursu WTL ${wtlCourseId}...`)

      // Pobierz lekcje z WTL API (robust helper with fallbacks)
      const wtlResp = await wtlClient.getLessons(wtlCourseId)
      if (!wtlResp.success) {
        throw new Error(`WTL getLessons error: ${wtlResp.error || 'unknown'}`)
      }
      const wtlLessons = wtlResp.data || []
      console.log(`📚 Pobrano ${wtlLessons.length} lekcji z WTL API`)

      if (wtlLessons.length === 0) {
        console.log(`ℹ️ Brak lekcji do synchronizacji dla kursu ${wtlCourseId}`)
        return
      }

      // Przygotuj lekcje do synchronizacji
      const nowIso = new Date().toISOString()
      const lessonsToSync = wtlLessons.map((lesson: any) => {
        // Mapuj różne możliwe pola z WTL API
        const lessonId = lesson.id || lesson.lesson_id || lesson.lessonId
        const lessonTitle = lesson.name || lesson.title || lesson.lesson_name
        const lessonDescription = lesson.description || lesson.summary || lesson.content_summary
        const lessonContent = lesson.content || lesson.lesson_content || lesson.text || ''
        const lessonOrder = lesson.order_number || lesson.order || lesson.position || lesson.sequence || 1
        
        return {
          wtl_lesson_id: lessonId.toString(),
          course_id: localCourseId,
          title: lessonTitle,
          description: lessonDescription || null,
          content: lessonContent || null,
          order_number: lessonOrder,
          status: 'active',
          last_sync_at: nowIso
        }
      })

      // Synchronizuj lekcje do bazy danych
      const { error: syncError } = await supabase
        .from('lessons')
        .upsert(lessonsToSync, { onConflict: 'wtl_lesson_id', ignoreDuplicates: false })

      if (syncError) {
        throw new Error(`Błąd synchronizacji lekcji: ${syncError.message}`)
      }

      await this.softDeleteMissingLessons(localCourseId, lessonsToSync.map(l => String(l.wtl_lesson_id)))
      console.log(`✅ Pomyślnie zsynchronizowano ${lessonsToSync.length} lekcji dla kursu ${wtlCourseId}`)

    } catch (error) {
      console.error(`❌ Błąd podczas synchronizacji lekcji dla kursu ${wtlCourseId}:`, error)
      throw error
    }
  }

  /**
   * Synchronizuje studentów dla konkretnego kursu
   */
  async syncCourseStudents(courseId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      courses: { created: 0, updated: 0, errors: 0 },
      students: { created: 0, updated: 0, errors: 0 },
      enrollments: { created: 0, updated: 0, errors: 0 },
      lessons: { created: 0, updated: 0, errors: 0 },
      errors: []
    }

    try {
      console.log(`👥 Synchronizuję studentów dla kursu ${courseId}...`)

      // Pobierz kurs z naszej bazy
      const { data: course } = await supabase
        .from('courses')
        .select('id, wtl_course_id')
        .eq('id', courseId)
        .single()

      if (!course) {
        throw new Error(`Kurs ${courseId} nie istnieje w bazie`)
      }

      // Pobierz studentów z WTL API
      const wtlResponse = await wtlClient.get(`/training/${course.wtl_course_id}/user/list?range=[0,1000]`)
      
      if (wtlResponse.status !== 200) {
        throw new Error(`WTL API error: ${wtlResponse.status}`)
      }

      const wtlStudents: WTLStudent[] = wtlResponse.data
      console.log(`📚 Pobrano ${wtlStudents.length} studentów z WTL API`)

      // Synchronizuj każdego studenta
      for (const wtlStudent of wtlStudents) {
        try {
          await this.syncStudent(wtlStudent, course.id)
          result.students.created++
        } catch (error) {
          console.error(`❌ Błąd synchronizacji studenta ${wtlStudent.id}:`, error)
          result.students.errors++
          result.errors.push(`Student ${wtlStudent.id}: ${error}`)
        }
      }

      console.log(`✅ Synchronizacja studentów zakończona: ${result.students.created} utworzonych`)
      
    } catch (error) {
      console.error('❌ Błąd podczas synchronizacji studentów:', error)
      result.success = false
      result.errors.push(`Ogólny błąd: ${error}`)
    }

    return result
  }

  /**
   * Synchronizuje pojedynczego studenta
   */
  private async syncStudent(wtlStudent: WTLStudent, courseId: string): Promise<void> {
    // Sprawdź czy student już istnieje
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .eq('wtl_student_id', wtlStudent.id)
      .single()

    let studentId: string

    if (existingStudent) {
      // Aktualizuj istniejącego studenta
      await supabase
        .from('students')
        .update({
          email: wtlStudent.email,
          username: wtlStudent.name || wtlStudent.first_name || wtlStudent.last_name,
          first_name: wtlStudent.first_name,
          last_name: wtlStudent.last_name,
          updated_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          sync_status: 'synced'
        })
        .eq('id', existingStudent.id)

      studentId = existingStudent.id
      console.log(`🔄 Zaktualizowano studenta: ${wtlStudent.email}`)
    } else {
      // Utwórz nowego studenta
      const { data: newStudent } = await supabase
        .from('students')
        .insert({
          wtl_student_id: wtlStudent.id,
          email: wtlStudent.email,
          username: wtlStudent.name || wtlStudent.first_name || wtlStudent.last_name,
          first_name: wtlStudent.first_name,
          last_name: wtlStudent.last_name,
          status: 'active',
          created_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          sync_status: 'synced'
        })
        .select('id')
        .single()

      studentId = newStudent!.id
      console.log(`✅ Utworzono nowego studenta: ${wtlStudent.email}`)
    }

    // Sprawdź czy zapisanie już istnieje
    const { data: existingEnrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .single()

    if (!existingEnrollment) {
      // Utwórz nowe zapisanie
      await supabase
        .from('course_enrollments')
        .insert({
          course_id: courseId,
          student_id: studentId,
          enrollment_date: new Date().toISOString(),
          status: 'enrolled',
          progress_percentage: 0,
          last_activity: new Date().toISOString(),
          created_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          sync_status: 'synced'
        })

      console.log(`✅ Utworzono zapisanie: ${wtlStudent.email} na kurs`)
    } else {
      // Aktualizuj istniejące zapisanie
      await supabase
        .from('course_enrollments')
        .update({
          updated_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          sync_status: 'synced'
        })
        .eq('id', existingEnrollment.id)

      console.log(`🔄 Zaktualizowano zapisanie: ${wtlStudent.email}`)
    }

    // Loguj synchronizację
    await this.logSync('student', wtlStudent.id, 'synced', { email: wtlStudent.email })
  }

  /**
   * Loguje akcję synchronizacji
   */
  private async logSync(entityType: string, entityId: string, action: string, details: any): Promise<void> {
    await supabase
      .from('sync_log')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        action,
        details,
        created_at: new Date().toISOString()
      })
  }

  /**
   * Pobiera kursy z lokalnej bazy danych
   */
  async getLocalCourses(status: 'active' | 'inactive' | 'all' = 'active'): Promise<any[]> {
    let query = supabase
      .from('courses')
      .select(`
        *,
        teacher:users(username, email)
      `)
      .order('title') as any

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Błąd pobierania kursów:', error)
      throw error
    }

    return data || []
  }

  /**
   * Pobiera studentów dla konkretnego kursu z lokalnej bazy danych
   */
  async getLocalCourseStudents(courseId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        student:students(*),
        course:courses(*)
      `)
      .eq('course_id', courseId)
      .order('created_at')

    if (error) {
      console.error('❌ Błąd pobierania studentów:', error)
      throw error
    }

    return data || []
  }

  // Soft-delete local courses missing from WTL
  private async softDeleteMissingCourses(wtlIds: string[]): Promise<void> {
    try {
      const nowIso = new Date().toISOString()
      const set = new Set(wtlIds.map(String))
      const { data: local, error } = await supabase
        .from('courses')
        .select('id, wtl_course_id, status')
      if (error) return
      const toDeactivate = (local || [])
        .filter((c: any) => !set.has(String(c.wtl_course_id)) && c.status !== 'inactive')
        .map((c: any) => c.id)
      if (toDeactivate.length > 0) {
        await supabase
          .from('courses')
          .update({ status: 'inactive', sync_status: 'deleted', updated_at: nowIso, last_sync_at: nowIso })
          .in('id', toDeactivate)
      }
    } catch {}
  }

  // Soft-delete lessons for a course that are missing in the latest WTL payload
  private async softDeleteMissingLessons(localCourseId: string, incomingWtlIds: string[]): Promise<void> {
    try {
      const nowIso = new Date().toISOString()
      const set = new Set(incomingWtlIds.map(String))
      const { data: local, error } = await supabase
        .from('lessons')
        .select('id, wtl_lesson_id, status')
        .eq('course_id', localCourseId)
      if (error) return
      const toDeactivate = (local || [])
        .filter((l: any) => !set.has(String(l.wtl_lesson_id)) && l.status !== 'inactive')
        .map((l: any) => l.id)
      if (toDeactivate.length > 0) {
        await supabase
          .from('lessons')
          .update({ status: 'inactive', sync_status: 'deleted', updated_at: nowIso, last_sync_at: nowIso })
          .in('id', toDeactivate)
      }
    } catch {}
  }

  /**
   * Pobiera statystyki synchronizacji
   */
  async getSyncStats(): Promise<any> {
    const { data: courses } = await supabase
      .from('courses')
      .select('sync_status', { count: 'exact' })

    const { data: students } = await supabase
      .from('students')
      .select('sync_status', { count: 'exact' })

    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('sync_status', { count: 'exact' })

    const { data: lessons } = await supabase
      .from('lessons')
      .select('sync_status', { count: 'exact' })

    return {
      courses: courses?.length || 0,
      students: students?.length || 0,
      enrollments: enrollments?.length || 0,
      lessons: lessons?.length || 0,
      lastSync: new Date().toISOString()
    }
  }
}

export const courseSyncService = new CourseSyncService()



