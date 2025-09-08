/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; checklistId: string; itemId: string }> }
) {
  try {
    const { id: threadId, checklistId, itemId } = await context.params
    const body = await request.json().catch(() => ({}))
    const { checked, label, position }: { checked?: boolean; label?: string; position?: number } = body || {}

    // Ensure item belongs to checklist and checklist to thread
    const { data: item, error: itemErr } = await supabase
      .from('thread_checklist_items')
      .select('id, checklist_id')
      .eq('id', itemId)
      .maybeSingle()
    if (itemErr || !item || item.checklist_id !== checklistId) {
      return NextResponse.json({ error: 'Pozycja nie została znaleziona' }, { status: 404 })
    }
    const { data: checklist, error: chkErr } = await supabase
      .from('thread_checklists')
      .select('id, thread_id')
      .eq('id', checklistId)
      .maybeSingle()
    if (chkErr || !checklist || checklist.thread_id !== threadId) {
      return NextResponse.json({ error: 'Checklist nie została znaleziona' }, { status: 404 })
    }

    const payload: any = {}
    if (checked !== undefined) payload.checked = !!checked
    if (label !== undefined) payload.label = String(label)
    if (position !== undefined) payload.position = position
    const { data: updated, error } = await supabase
      .from('thread_checklist_items')
      .update(payload)
      .eq('id', itemId)
      .select('id, checklist_id, label, position, checked, created_at')
      .single()
    if (error) {
      return NextResponse.json({ error: 'Błąd aktualizacji pozycji' }, { status: 500 })
    }
    return NextResponse.json({ item: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; checklistId: string; itemId: string }> }
) {
  try {
    const { id: threadId, checklistId, itemId } = await context.params

    // Ensure item belongs to checklist and checklist to thread
    const { data: item, error: itemErr } = await supabase
      .from('thread_checklist_items')
      .select('id, checklist_id')
      .eq('id', itemId)
      .maybeSingle()
    if (itemErr || !item || item.checklist_id !== checklistId) {
      return NextResponse.json({ error: 'Pozycja nie została znaleziona' }, { status: 404 })
    }
    const { data: checklist, error: chkErr } = await supabase
      .from('thread_checklists')
      .select('id, thread_id')
      .eq('id', checklistId)
      .maybeSingle()
    if (chkErr || !checklist || checklist.thread_id !== threadId) {
      return NextResponse.json({ error: 'Checklist nie została znaleziona' }, { status: 404 })
    }

    const { error } = await supabase
      .from('thread_checklist_items')
      .delete()
      .eq('id', itemId)
    if (error) {
      return NextResponse.json({ error: 'Błąd usuwania pozycji' }, { status: 500 })
    }
    return NextResponse.json({ message: 'Pozycja usunięta' })
  } catch (e) {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}
