/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sectionId: string; itemId: string }> }
) {
  try {
    const { sectionId, itemId } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
    }

    const url = new URL(request.url)
    const qpUserId = url.searchParams.get('user_id')
    const body = await request.json().catch(() => ({}))
    const userId: string | null = body?.user_id || qpUserId
    if (!userId) {
      return NextResponse.json({ error: 'Brak user_id' }, { status: 400 })
    }

    // Verify item belongs to section
    const { data: itemRow, error: itemErr } = await supabase
      .from('lesson_section_checklist_items')
      .select('id, section_id')
      .eq('id', itemId)
      .maybeSingle()
    if (itemErr || !itemRow || itemRow.section_id !== sectionId) {
      return NextResponse.json({ error: 'Pozycja nie znaleziona' }, { status: 404 })
    }

    // Toggle
    const { data: existing } = await supabase
      .from('lesson_section_checklist_progress')
      .select('id')
      .eq('item_id', itemId)
      .eq('user_id', userId)
      .maybeSingle()

    let toggled: 'checked' | 'unchecked' = 'checked'
    if (existing?.id) {
      const { error: delErr } = await supabase
        .from('lesson_section_checklist_progress')
        .delete()
        .eq('id', existing.id)
      if (delErr) {
        return NextResponse.json({ error: 'Błąd odznaczania pozycji' }, { status: 500 })
      }
      toggled = 'unchecked'
    } else {
      const { error: insErr } = await supabase
        .from('lesson_section_checklist_progress')
        .insert({ item_id: itemId, user_id: userId })
      if (insErr) {
        return NextResponse.json({ error: 'Błąd zaznaczania pozycji' }, { status: 500 })
      }
    }

    // Recalculate section status for user
    const { data: allItems } = await supabase
      .from('lesson_section_checklist_items')
      .select('id')
      .eq('section_id', sectionId)

    const total = (allItems || []).length
    let checked = 0
    if (total > 0) {
      const ids = (allItems || []).map((r: any) => r.id)
      const { data: checkedRows } = await supabase
        .from('lesson_section_checklist_progress')
        .select('id')
        .in('item_id', ids)
        .eq('user_id', userId)
      checked = (checkedRows || []).length
    }

    let status: 'todo' | 'in_progress' | 'done' = 'todo'
    if (total > 0) {
      if (checked === 0) status = 'todo'
      else if (checked === total) status = 'done'
      else status = 'in_progress'
    }

    const nowIso = new Date().toISOString()
    // Upsert progress row with timestamps
    const { data: existingProg } = await supabase
      .from('lesson_section_progress')
      .select('*')
      .eq('section_id', sectionId)
      .eq('user_id', userId)
      .maybeSingle()

    const update: any = { status }
    if (!existingProg && (status === 'in_progress' || status === 'done')) update.started_at = nowIso
    if (status === 'done') update.completed_at = nowIso
    if (status !== 'done') update.completed_at = null

    let saved
    if (existingProg) {
      saved = await supabase
        .from('lesson_section_progress')
        .update(update)
        .eq('id', existingProg.id)
        .select('*')
        .single()
    } else {
      saved = await supabase
        .from('lesson_section_progress')
        .insert({ section_id: sectionId, user_id: userId, ...update })
        .select('*')
        .single()
    }
    if (saved.error) {
      return NextResponse.json({ error: 'Błąd aktualizacji statusu sekcji' }, { status: 500 })
    }

    return NextResponse.json({
      toggled,
      status,
      counts: { checked, total },
      progress: saved.data,
    })
  } catch (e) {
    console.error('Checklist item progress toggle error:', e)
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

