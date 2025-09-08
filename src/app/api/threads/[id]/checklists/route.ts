/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await context.params
    const url = new URL(request.url)
    const visibilityFor = url.searchParams.get('visibility_for') || 'teacher'
    const includeItems = url.searchParams.get('include_items') === 'true'

    let query = supabase
      .from('thread_checklists')
      .select('id, thread_id, created_by, created_at, updated_at, visibility, due_at, status')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })

    if (visibilityFor === 'student') {
      query = query.eq('visibility', 'public')
    }

    const { data: checklists, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Błąd podczas pobierania checklist' }, { status: 500 })
    }

    let result = checklists || []

    if (includeItems && result.length > 0) {
      const ids = result.map((c: any) => c.id)
      const { data: items } = await supabase
        .from('thread_checklist_items')
        .select('id, checklist_id, label, position, checked, created_at')
        .in('checklist_id', ids)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      const byChecklist = new Map<string, any[]>()
      for (const it of items || []) {
        const arr = byChecklist.get(it.checklist_id) || []
        arr.push(it)
        byChecklist.set(it.checklist_id, arr)
      }
      result = result.map((c: any) => ({ ...c, items: byChecklist.get(c.id) || [] }))
    }

    return NextResponse.json({ checklists: result })
  } catch (e) {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
    }

    const url = new URL(request.url)
    const createdBy = url.searchParams.get('created_by') || url.searchParams.get('user_id') || null

    const body = await request.json()
    const {
      due_at,
      visibility,
      items,
      status,
    }: {
      due_at?: string | null
      visibility?: 'public' | 'private'
      items?: { label: string; position?: number }[]
      status?: 'todo' | 'in_progress' | 'done'
    } = body

    const normalizedItems = (Array.isArray(items) ? items : []).map((it: any) => ({ label: String(it.label || '').trim(), position: it.position }))
    const nonEmpty = normalizedItems.filter((x: any) => x.label.length > 0)
    if (nonEmpty.length === 0) {
      return NextResponse.json({ error: 'Dodaj przynajmniej jeden element checklisty' }, { status: 400 })
    }

    // Ensure thread exists
    const { data: thread, error: threadErr } = await supabase
      .from('threads')
      .select('id')
      .eq('id', threadId)
      .maybeSingle()
    if (threadErr || !thread) {
      return NextResponse.json({ error: 'Wątek nie został znaleziony' }, { status: 404 })
    }

    // Enforce one checklist per thread
    const { data: existing } = await supabase
      .from('thread_checklists')
      .select('id')
      .eq('thread_id', threadId)
      .limit(1)
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Checklist już istnieje dla tego wątku' }, { status: 409 })
    }

    const { data: checklist, error } = await supabase
      .from('thread_checklists')
      .insert({
        thread_id: threadId,
        created_by: createdBy,
        visibility: visibility === 'public' ? 'public' : 'private',
        due_at: due_at || null,
        status: status || 'todo',
      })
      .select('*')
      .single()

    if (error || !checklist) {
      return NextResponse.json({ error: 'Błąd podczas tworzenia checklisty' }, { status: 500 })
    }

    const toInsert = nonEmpty.map((it: any, idx: number) => ({
      checklist_id: checklist.id,
      label: it.label,
      position: it.position ?? idx,
    }))
    const { data: createdItems, error: itemsErr } = await supabase
      .from('thread_checklist_items')
      .insert(toInsert)
      .select('*')

    if (itemsErr) {
      await supabase.from('thread_checklists').delete().eq('id', checklist.id)
      return NextResponse.json({ error: 'Błąd podczas zapisywania pozycji' }, { status: 500 })
    }

    return NextResponse.json({ checklist, items: createdItems || [] }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}
