/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { CreateThreadRequest } from "@/types/threads"
import wtlClient from "@/lib/wtl-client"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper: resolve user_id (accepts users.id or students.id). Returns users.id or null
async function resolveUserId(idOrStudentId: string): Promise<string | null> {
  if (!idOrStudentId) return null
  // 1) Try as users.id
  const { data: userById } = await supabase
    .from('users')
    .select('id')
    .eq('id', idOrStudentId)
    .maybeSingle()

  if (userById?.id) return userById.id

  // 2) Try as students.id -> map by email to users.id
  const { data: student } = await supabase
    .from('students')
    .select('email')
    .eq('id', idOrStudentId)
    .maybeSingle()

  if (student?.email) {
    const { data: userByEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', student.email)
      .maybeSingle()
    if (userByEmail?.id) return userByEmail.id
  }

  return null
}

// Helper: resolve array of lesson identifiers to local lessons.id (uuid)
async function resolveLessonIdsToLocal(lessonIds: string[] | undefined | null): Promise<string[]> {
  if (!lessonIds || lessonIds.length === 0) return []

  const unique = Array.from(new Set(lessonIds.filter(Boolean)))

  // Try match by local UUID first
  let { data: byId } = await supabase
    .from('lessons')
    .select('id, wtl_lesson_id')
    .in('id', unique as string[])

  byId = byId || []
  const matchedById = new Map((byId as any[]).map((r) => [String(r.id), String(r.id)]))
  const unresolved = unique.filter((x) => !matchedById.has(x))

  // For unresolved, try by WTL id
  let byWtl: any[] = []
  if (unresolved.length > 0) {
    const resp = await supabase
      .from('lessons')
      .select('id, wtl_lesson_id')
      .in('wtl_lesson_id', unresolved as string[])
    byWtl = resp.data || []
  }

  const wtlMap = new Map(byWtl.map((r) => [String(r.wtl_lesson_id), String(r.id)]))

  // Build final list, preserving input order
  const resolved: string[] = unique.map((orig) => matchedById.get(orig) || wtlMap.get(orig) || orig)
  return resolved
}

// GET: lista wątków (czyta z tabeli `threads` po migracji)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lesson_id')
    const includeConnections = searchParams.get('include_connections') === 'true'
    const courseId = searchParams.get('courseId') || searchParams.get('course_id')
    const ownerStudentId = searchParams.get('owner_student_id')
    const ownerUserIdParam = searchParams.get('user_id')
    const ownerEmail = searchParams.get('owner_email')

    let ownerUserId: string | null = null
    if (ownerUserIdParam) ownerUserId = await resolveUserId(ownerUserIdParam)
    else if (ownerStudentId) ownerUserId = await resolveUserId(ownerStudentId)
    else if (ownerEmail) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', ownerEmail)
        .maybeSingle()
      ownerUserId = userByEmail?.id || null
    }

    let query = supabase
      .from('threads')
      .select('*')
      .order('created_at', { ascending: false })

    if (lessonId) {
      query = supabase
        .from('threads')
        .select(`
          *,
          lesson_connections:thread_lesson_connections!inner(*)
        `)
        .eq('thread_lesson_connections.lesson_id', lessonId)
        .order('created_at', { ascending: false })
    } else if (courseId) {
      const { data: mappedRows, error: mapErr } = await supabase
        .from('course_lessons')
        .select('lesson_id, lesson:lessons(id, wtl_lesson_id)')
        .eq('course_id', courseId)
        .order('position', { ascending: true })

      let allowedLessonIds: string[] = []
      if (!mapErr && mappedRows && mappedRows.length > 0) {
        allowedLessonIds = (mappedRows || [])
          .map((r: any) => r.lesson?.id)
          .filter(Boolean)
      } else {
        const { data: lessonsByCourse } = await supabase
          .from('lessons')
          .select('id')
          .eq('course_id', courseId)
        allowedLessonIds = (lessonsByCourse || []).map((r: any) => r.id)
      }

      query = supabase
        .from('threads')
        .select(`
          *,
          lesson_connections:thread_lesson_connections(*)
        `)
        .in('thread_lesson_connections.lesson_id', allowedLessonIds)
        .order('created_at', { ascending: false })
    }

    if (ownerUserId) {
      query = query.eq('user_id', ownerUserId)
    }

    if (includeConnections || lessonId || courseId) {
      const { data: threads, error } = await supabase
        .from('threads')
        .select(`
          *,
          lesson_connections:thread_lesson_connections(*)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return NextResponse.json({ threads: threads || [] })
    }

    const { data: threads, error } = await query
    if (error) throw error
    return NextResponse.json({ threads: threads || [] })
  } catch {
    return NextResponse.json(
      { error: "Błąd podczas pobierania wątków" },
      { status: 500 }
    )
  }
}

// POST: utwórz nowy wątek (zapis do tabeli `threads`)
export async function POST(request: NextRequest) {
  try {
    const { title, content, lesson_ids, connection_types }: CreateThreadRequest = await request.json()

    if (!title || !content) {
      return NextResponse.json(
        { error: "Tytuł i treść są wymagane" },
        { status: 400 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Brak autoryzacji" },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const userIdRaw = url.searchParams.get('user_id')
    const trainingId = url.searchParams.get('trainingId') || url.searchParams.get('training_id')

    if (!userIdRaw) {
      return NextResponse.json(
        { error: "Brak user_id" },
        { status: 400 }
      )
    }

    const resolvedUserId = await resolveUserId(userIdRaw)
    if (!resolvedUserId) {
      return NextResponse.json(
        { error: "Nie znaleziono użytkownika dla podanego ID (users/students)" },
        { status: 400 }
      )
    }
    const user_id = resolvedUserId

    if (trainingId && lesson_ids && lesson_ids.length > 0) {
      try {
        const allowedResp = await wtlClient.getLessons(trainingId)
        const allowed = new Set((allowedResp.data || []).map((l: any) => String(l.id)))
        const invalid = (lesson_ids || []).filter((id) => !allowed.has(String(id)))
        if (invalid.length > 0) {
          return NextResponse.json(
            { error: `Lekcje nie należą do wybranego kursu: ${invalid.join(', ')}` },
            { status: 400 }
          )
        }
      } catch {
        return NextResponse.json(
          { error: 'Nie udało się zweryfikować lekcji dla kursu' },
          { status: 400 }
        )
      }
    }

    const resolvedLessonIds = await resolveLessonIdsToLocal(lesson_ids)

    const { data: note, error: noteError } = await supabase
      .from('threads')
      .insert({ title, content, user_id })
      .select()
      .single()

    if (noteError) {
      return NextResponse.json(
        { error: "Błąd podczas tworzenia wątku" },
        { status: 500 }
      )
    }

    if (resolvedLessonIds && resolvedLessonIds.length > 0) {
      const connections = resolvedLessonIds.map((lesson_id: string, index: number) => ({
        thread_id: note.id,
        lesson_id,
        connection_type: connection_types?.[index] || 'related'
      }))

      const { error: connectionError } = await supabase
        .from('thread_lesson_connections')
        .insert(connections)

      if (connectionError) {
        await supabase.from('threads').delete().eq('id', note.id)
        return NextResponse.json(
          { error: "Błąd podczas tworzenia powiązań z lekcjami" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ note, message: "Wątek został utworzony pomyślnie" }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Wystąpił nieoczekiwany błąd" },
      { status: 500 }
    )
  }
}
