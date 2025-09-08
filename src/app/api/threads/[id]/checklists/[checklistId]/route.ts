/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const { id: threadId, checklistId } = await context.params
    const body = await request.json().catch(() => ({}))
    const { due_at, visibility, status }: { due_at?: string | null; visibility?: 'public' | 'private'; status?: 'todo' | 'in_progress' | 'done' } = body || {}

    // Ensure checklist belongs to thread
    const { data: existing, error: findErr } = await supabase
      .from('thread_checklists')
      .select('id, thread_id')
      .eq('id', checklistId)
      .maybeSingle()
    if (findErr || !existing || existing.thread_id !== threadId) {
      return NextResponse.json({ error: 'Checklist nie została znaleziona' }, { status: 404 })
    }

    const payload: any = {}
    if (due_at !== undefined) payload.due_at = due_at
    if (visibility !== undefined) payload.visibility = visibility
    if (status !== undefined) payload.status = status

    const { error } = await supabase
      .from('thread_checklists')
      .update(payload)
      .eq('id', checklistId)

    if (error) {
      return NextResponse.json({ error: 'Błąd aktualizacji checklisty' }, { status: 500 })
    }
    return NextResponse.json({ message: 'Checklist zaktualizowana' })
  } catch (e) {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const { id: threadId, checklistId } = await context.params

    // Ensure checklist belongs to thread
    const { data: existing, error: findErr } = await supabase
      .from('thread_checklists')
      .select('id, thread_id')
      .eq('id', checklistId)
      .maybeSingle()
    if (findErr || !existing || existing.thread_id !== threadId) {
      return NextResponse.json({ error: 'Checklist nie została znaleziona' }, { status: 404 })
    }

    const { error } = await supabase
      .from('thread_checklists')
      .delete()
      .eq('id', checklistId)

    if (error) {
      return NextResponse.json({ error: 'Błąd usuwania checklisty' }, { status: 500 })
    }
    return NextResponse.json({ message: 'Checklist usunięta' })
  } catch (e) {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}
