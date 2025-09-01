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

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single()
    if (courseError || !course) {
      return NextResponse.json({ success: false, message: 'Kurs nie istnieje' }, { status: 404 })
    }

    const { data: teachers, error } = await supabase
      .from('course_teachers')
      .select(`
        *,
        teacher:users!course_teachers_teacher_id_fkey(id, email, username, first_name, last_name, role),
        assigned_by_user:users!course_teachers_assigned_by_fkey(id, email, username)
      `)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, message: 'Błąd pobierania nauczycieli', error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, teachers: teachers || [] })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Wystąpił błąd', error: error instanceof Error ? error.message : 'Nieznany błąd' }, { status: 500 })
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

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single()
    if (courseError || !course) {
      return NextResponse.json({ success: false, message: 'Kurs nie istnieje' }, { status: 404 })
    }

    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id, email, username, role')
      .eq('id', teacherId)
      .eq('role', 'teacher')
      .single()
    if (teacherError || !teacher) {
      return NextResponse.json({ success: false, message: 'Użytkownik nie istnieje lub nie ma roli nauczyciela' }, { status: 400 })
    }

    if (assignedBy) {
      const { data: assignedByUser, error: assignedByError } = await supabase
        .from('users')
        .select('id, email, username')
        .eq('id', assignedBy)
        .single()
      if (assignedByError || !assignedByUser) {
        return NextResponse.json({ success: false, message: 'Użytkownik przypisujący nie istnieje' }, { status: 400 })
      }
    }

    const { data: existingAssignment } = await supabase
      .from('course_teachers')
      .select('id, is_active')
      .eq('course_id', courseId)
      .eq('teacher_id', teacherId)
      .maybeSingle()

    if (existingAssignment) {
      if (existingAssignment.is_active) {
        return NextResponse.json({ success: false, message: 'Nauczyciel jest już przypisany do tego kursu' }, { status: 400 })
      } else {
        const { data: assignment, error: assignmentError } = await supabase
          .from('course_teachers')
          .update({ role, assigned_by: assignedBy, is_active: true, assigned_at: new Date().toISOString() })
          .eq('id', existingAssignment.id)
          .select(`
            *,
            teacher:users!course_teachers_teacher_id_fkey(id, email, username, first_name, last_name)
          `)
          .single()
        if (assignmentError) {
          return NextResponse.json({ success: false, message: 'Błąd podczas przypisywania nauczyciela', error: assignmentError.message }, { status: 500 })
        }
        return NextResponse.json({ success: true, message: 'Nauczyciel został przypisany do kursu', assignment })
      }
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from('course_teachers')
      .insert({ course_id: courseId, teacher_id: teacherId, role, assigned_by: assignedBy, is_active: true })
      .select(`
        *,
        teacher:users!course_teachers_teacher_id_fkey(id, email, username, first_name, last_name)
      `)
      .single()
    if (assignmentError) {
      return NextResponse.json({ success: false, message: 'Błąd podczas przypisywania nauczyciela', error: assignmentError.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, message: 'Nauczyciel został przypisany do kursu', assignment })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Wystąpił błąd', error: error instanceof Error ? error.message : 'Nieznany błąd' }, { status: 500 })
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
    const { error } = await supabase
      .from('course_teachers')
      .update({ role })
      .eq('course_id', courseId)
      .eq('teacher_id', teacherId)
      .eq('is_active', true)
    if (error) {
      return NextResponse.json({ success: false, message: 'Błąd aktualizacji roli', error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, message: 'Rola nauczyciela została zaktualizowana' })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Wystąpił błąd', error: error instanceof Error ? error.message : 'Nieznany błąd' }, { status: 500 })
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
    const { error } = await supabase
      .from('course_teachers')
      .update({ is_active: false })
      .eq('course_id', courseId)
      .eq('teacher_id', teacherId)
      .eq('is_active', true)
    if (error) {
      return NextResponse.json({ success: false, message: 'Błąd podczas usuwania przypisania', error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, message: 'Przypisanie nauczyciela zostało usunięte' })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Wystąpił błąd', error: error instanceof Error ? error.message : 'Nieznany błąd' }, { status: 500 })
  }
}

