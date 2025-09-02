/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { UpdateThreadRequest as UpdateNoteRequest } from "@/types/threads"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper: resolve array of lesson identifiers to local lessons.id (uuid)
async function resolveLessonIdsToLocal(lessonIds: string[] | undefined | null): Promise<string[]> {
  if (!lessonIds || lessonIds.length === 0) return []

  const unique = Array.from(new Set(lessonIds.filter(Boolean)))

  let { data: byId } = await supabase
    .from('lessons')
    .select('id, wtl_lesson_id')
    .in('id', unique as string[])

  byId = byId || []
  const matchedById = new Map((byId as any[]).map((r) => [String(r.id), String(r.id)]))
  const unresolved = unique.filter((x) => !matchedById.has(x))

  let byWtl: any[] = []
  if (unresolved.length > 0) {
    const resp = await supabase
      .from('lessons')
      .select('id, wtl_lesson_id')
      .in('wtl_lesson_id', unresolved as string[])
    byWtl = resp.data || []
  }

  const wtlMap = new Map(byWtl.map((r) => [String(r.wtl_lesson_id), String(r.id)]))

  const resolved: string[] = unique.map((orig) => matchedById.get(orig) || wtlMap.get(orig) || orig)
  return resolved
}

// GET: pojedynczy wątek (czyta z `threads`)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const { data: note, error } = await supabase
      .from('threads')
      .select(`
        *,
        lesson_connections:thread_lesson_connections(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Wątek nie został znaleziony" },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: "Błąd podczas pobierania wątku" },
        { status: 500 }
      )
    }

    return NextResponse.json({ thread: note })
  } catch {
    return NextResponse.json(
      { error: "Wystąpił nieoczekiwany błąd" },
      { status: 500 }
    )
  }
}

// PUT: aktualizuj wątek
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { title, content, lesson_ids, connection_types }: UpdateNoteRequest = await request.json()

    const { data: existingNote, error: checkError } = await supabase
      .from('threads')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError || !existingNote) {
      return NextResponse.json(
        { error: "Wątek nie został znaleziony" },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('threads')
        .update(updateData)
        .eq('id', id)

      if (updateError) {
        return NextResponse.json(
          { error: "Błąd podczas aktualizacji wątku" },
          { status: 500 }
        )
      }
    }

    if (lesson_ids !== undefined) {
      const resolvedLessonIds = await resolveLessonIdsToLocal(lesson_ids)
      await supabase
        .from('thread_lesson_connections')
        .delete()
        .eq('thread_id', id)

      if (resolvedLessonIds.length > 0) {
        const connections = resolvedLessonIds.map((lesson_id: string, index: number) => ({
          thread_id: id,
          lesson_id,
          connection_type: connection_types?.[index] || 'related'
        }))

        const { error: connectionError } = await supabase
          .from('thread_lesson_connections')
          .insert(connections)

        if (connectionError) {
          return NextResponse.json(
            { error: "Błąd podczas aktualizacji powiązań z lekcjami" },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({ message: "Wątek został zaktualizowany pomyślnie" })
  } catch {
    return NextResponse.json(
      { error: "Wystąpił nieoczekiwany błąd" },
      { status: 500 }
    )
  }
}

// DELETE: usuń wątek
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const { data: existingNote, error: checkError } = await supabase
      .from('threads')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError || !existingNote) {
      return NextResponse.json(
        { error: "Wątek nie został znaleziony" },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabase
      .from('threads')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: "Błąd podczas usuwania wątku" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Wątek został usunięty pomyślnie" })
  } catch {
    return NextResponse.json(
      { error: "Wystąpił nieoczekiwany błąd" },
      { status: 500 }
    )
  }
}
