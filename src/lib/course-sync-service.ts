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
      console.log(`📚 Pobrano ${wtlCourses.length} kursów z WTL API`)

      // Synchronizuj każdy kurs
      for (const wtlCourse of wtlCourses) {
        try {
          await this.syncCourse(wtlCourse)
          result.courses.created++
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
  private async syncCourse(wtlCourse: WTLTraining): Promise<void> {
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

    // Loguj synchronizację
    await this.logSync('course', wtlCourse.id, 'synced', { name: wtlCourse.name })
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
  async getLocalCourses(): Promise<any[]> {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        teacher:users(username, email)
      `)
      .order('title')

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

    return {
      courses: courses?.length || 0,
      students: students?.length || 0,
      enrollments: enrollments?.length || 0,
      lastSync: new Date().toISOString()
    }
  }
}

export const courseSyncService = new CourseSyncService()
