/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await context.params
    const url = new URL(request.url)
    const visibilityFor = url.searchParams.get('visibility_for') || 'teacher'
    const includeItems = url.searchParams.get('include_items') === 'true'
    const includeProgressFor = url.searchParams.get('include_progress_for')

    let query = supabase
      .from('lesson_sections')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (visibilityFor === 'student') {
      query = query.eq('visibility', 'public')
    }

    const { data: sections, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Błąd pobierania sekcji' }, { status: 500 })
    }

    const enriched = sections || []

    // Optionally fetch checklist items
    let itemsBySection = new Map<string, any[]>()
    if (includeItems && enriched.length > 0) {
      const ids = enriched.map((s: any) => s.id)
      const { data: items } = await supabase
        .from('lesson_section_checklist_items')
        .select('*')
        .in('section_id', ids)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      if (items) {
        itemsBySection = new Map<string, any[]>()
        for (const it of items) {
          const arr = itemsBySection.get(it.section_id) || []
          arr.push(it)
          itemsBySection.set(it.section_id, arr)
        }
      }
    }

    // Optionally fetch per-user progress
    let progressBySection = new Map<string, any>()
    if (includeProgressFor && enriched.length > 0) {
      const ids = enriched.map((s: any) => s.id)
      const { data: progress } = await supabase
        .from('lesson_section_progress')
        .select('*')
        .in('section_id', ids)
        .eq('user_id', includeProgressFor)
      if (progress) {
        progressBySection = new Map(progress.map((p: any) => [p.section_id, p]))
      }
    }

    const result = enriched.map((s: any) => ({
      ...s,
      items: includeItems ? (itemsBySection.get(s.id) || []) : undefined,
      progress: includeProgressFor ? (progressBySection.get(s.id) || null) : undefined,
    }))

    return NextResponse.json({ sections: result })
  } catch (e) {
    console.error('Sections GET error:', e)
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
    }

    const url = new URL(request.url)
    const createdBy = url.searchParams.get('created_by') || url.searchParams.get('user_id') || null

    const body = await request.json()
    const {
      type,
      title,
      content_html,
      position,
      due_at,
      visibility,
      items,
    }: {
      type: 'note_task' | 'checklist_task'
      title: string
      content_html?: string
      position?: number
      due_at?: string | null
      visibility?: 'public' | 'private'
      items?: { label: string; position?: number }[]
    } = body

    if (!type || !title) {
      return NextResponse.json({ error: 'Typ i tytuł są wymagane' }, { status: 400 })
    }

    const insertPayload: any = {
      lesson_id: lessonId,
      type,
      title,
      content_html: content_html || null,
      position: position ?? 0,
      due_at: due_at || null,
      visibility: visibility === 'public' ? 'public' : 'private',
      created_by: createdBy,
    }

    const { data: section, error } = await supabase
      .from('lesson_sections')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error || !section) {
      return NextResponse.json({ error: 'Błąd tworzenia sekcji' }, { status: 500 })
    }

    let createdItems: any[] | undefined
    if (type === 'checklist_task' && Array.isArray(items) && items.length > 0) {
      const toInsert = items.map((it: any, idx: number) => ({
        section_id: section.id,
        label: String(it.label || '').trim(),
        position: it.position ?? idx,
      })).filter((x: any) => x.label.length > 0)
      if (toInsert.length > 0) {
        const { data: itemRows, error: itemErr } = await supabase
          .from('lesson_section_checklist_items')
          .insert(toInsert)
          .select('*')
        if (itemErr) {
          // best-effort cleanup
          await supabase.from('lesson_sections').delete().eq('id', section.id)
          return NextResponse.json({ error: 'Błąd tworzenia pozycji checklisty' }, { status: 500 })
        }
        createdItems = itemRows || []
      }
    }

    return NextResponse.json({ section, items: createdItems || [] }, { status: 201 })
  } catch (e) {
    console.error('Sections POST error:', e)
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

