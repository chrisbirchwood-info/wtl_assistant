import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Pobierz nauczycieli przypisanych do kursu
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params
    
    console.log(`👥 Pobieram nauczycieli dla kursu ${courseId}...`)
    
    const { data: teachers, error } = await supabase
      .from('course_teachers')
      .select(`
        *,
        teacher:users(id, email, username, first_name, last_name, role),
        assigned_by_user:users!course_teachers_assigned_by_fkey(id, email, username)
      `)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })

    if (error) {
      console.error('❌ Błąd pobierania nauczycieli:', error)
      return NextResponse.json({
        success: false,
        message: 'Wystąpił błąd podczas pobierania nauczycieli',
        error: error.message
      }, { status: 500 })
    }

    console.log(`✅ Pobrano ${teachers?.length || 0} nauczycieli`)
    
    return NextResponse.json({
      success: true,
      teachers: teachers || []
    })
    
  } catch (error) {
    console.error('❌ Błąd podczas pobierania nauczycieli:', error)
    return NextResponse.json({
      success: false,
      message: 'Wystąpił nieoczekiwany błąd',
      error: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 })
  }
}

// POST - Przypisz nauczyciela do kursu
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params
    const { teacherId, role = 'teacher', assignedBy } = await request.json()
    
    console.log(`👥 Przypisuję nauczyciela ${teacherId} do kursu ${courseId} z rolą ${role}...`)
    
    // Sprawdź czy kurs istnieje
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single()
    
    if (courseError || !course) {
      return NextResponse.json({
        success: false,
        message: 'Kurs nie istnieje'
      }, { status: 404 })
    }
    
    // Sprawdź czy nauczyciel istnieje i ma rolę teacher
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id, email, username, role')
      .eq('id', teacherId)
      .eq('role', 'teacher')
      .single()
    
    if (teacherError || !teacher) {
      return NextResponse.json({
        success: false,
        message: 'Użytkownik nie istnieje lub nie ma roli nauczyciela'
      }, { status: 400 })
    }
    
    // Sprawdź czy przypisanie już istnieje
    const { data: existingAssignment } = await supabase
      .from('course_teachers')
      .select('id')
      .eq('course_id', courseId)
      .eq('teacher_id', teacherId)
      .eq('is_active', true)
      .single()
    
    if (existingAssignment) {
      return NextResponse.json({
        success: false,
        message: 'Nauczyciel jest już przypisany do tego kursu'
      }, { status: 400 })
    }
    
    // Utwórz przypisanie
    const { data: assignment, error: assignmentError } = await supabase
      .from('course_teachers')
      .insert({
        course_id: courseId,
        teacher_id: teacherId,
        role,
        assigned_by: assignedBy,
        is_active: true
      })
      .select(`
        *,
        teacher:users(id, email, username, first_name, last_name)
      `)
      .single()
    
    if (assignmentError) {
      console.error('❌ Błąd tworzenia przypisania:', assignmentError)
      return NextResponse.json({
        success: false,
        message: 'Wystąpił błąd podczas przypisywania nauczyciela',
        error: assignmentError.message
      }, { status: 500 })
    }
    
    console.log(`✅ Nauczyciel ${teacher.email} został przypisany do kursu ${course.title}`)
    
    return NextResponse.json({
      success: true,
      message: 'Nauczyciel został przypisany do kursu',
      assignment
    })
    
  } catch (error) {
    console.error('❌ Błąd podczas przypisywania nauczyciela:', error)
    return NextResponse.json({
      success: false,
      message: 'Wystąpił nieoczekiwany błąd',
      error: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 })
  }
}

// DELETE - Usuń przypisanie nauczyciela do kursu
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params
    const { teacherId } = await request.json()
    
    console.log(`👥 Usuwam przypisanie nauczyciela ${teacherId} z kursu ${courseId}...`)
    
    // Dezaktywuj przypisanie (soft delete)
    const { error } = await supabase
      .from('course_teachers')
      .update({ is_active: false })
      .eq('course_id', courseId)
      .eq('teacher_id', teacherId)
      .eq('is_active', true)
    
    if (error) {
      console.error('❌ Błąd usuwania przypisania:', error)
      return NextResponse.json({
        success: false,
        message: 'Wystąpił błąd podczas usuwania przypisania',
        error: error.message
      }, { status: 500 })
    }
    
    console.log(`✅ Przypisanie nauczyciela ${teacherId} zostało usunięte z kursu ${courseId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Przypisanie nauczyciela zostało usunięte'
    })
    
  } catch (error) {
    console.error('❌ Błąd podczas usuwania przypisania:', error)
    return NextResponse.json({
      success: false,
      message: 'Wystąpił nieoczekiwany błąd',
      error: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 })
  }
}

// PATCH - Zaktualizuj rolę nauczyciela w kursie
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params
    const { teacherId, role } = await request.json()
    
    console.log(`👥 Aktualizuję rolę nauczyciela ${teacherId} w kursie ${courseId} na ${role}...`)
    
    // Zaktualizuj rolę
    const { error } = await supabase
      .from('course_teachers')
      .update({ role })
      .eq('course_id', courseId)
      .eq('teacher_id', teacherId)
      .eq('is_active', true)
    
    if (error) {
      console.error('❌ Błąd aktualizacji roli:', error)
      return NextResponse.json({
        success: false,
        message: 'Wystąpił błąd podczas aktualizacji roli',
        error: error.message
      }, { status: 500 })
    }
    
    console.log(`✅ Rola nauczyciela ${teacherId} została zaktualizowana na ${role}`)
    
    return NextResponse.json({
      success: true,
      message: 'Rola nauczyciela została zaktualizowana'
    })
    
  } catch (error) {
    console.error('❌ Błąd podczas aktualizacji roli:', error)
    return NextResponse.json({
      success: false,
      message: 'Wystąpił nieoczekiwany błąd',
      error: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 })
  }
}
