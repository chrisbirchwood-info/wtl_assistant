/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const { id: threadId, checklistId } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { label, position }: { label?: string; position?: number } = body || {}
    const trimmed = String(label || '').trim()
    if (!trimmed) {
      return NextResponse.json({ error: 'Etykieta jest wymagana' }, { status: 400 })
    }

    // Ensure checklist belongs to thread
    const { data: checklist, error: chkErr } = await supabase
      .from('thread_checklists')
      .select('id, thread_id')
      .eq('id', checklistId)
      .maybeSingle()
    if (chkErr || !checklist || checklist.thread_id !== threadId) {
      return NextResponse.json({ error: 'Checklist nie została znaleziona' }, { status: 404 })
    }

    const { data: item, error } = await supabase
      .from('thread_checklist_items')
      .insert({ checklist_id: checklistId, label: trimmed, position: position ?? 0 })
      .select('*')
      .single()
    if (error) {
      return NextResponse.json({ error: 'Błąd dodawania pozycji' }, { status: 500 })
    }
    return NextResponse.json({ item }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

