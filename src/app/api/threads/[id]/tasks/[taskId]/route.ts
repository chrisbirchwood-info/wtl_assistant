/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: threadId, taskId } = await context.params
    const { data: task, error } = await supabase
      .from('thread_tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle()
    if (error || !task || task.thread_id !== threadId) {
      return NextResponse.json({ error: 'Zadanie nie zostało znalezione' }, { status: 404 })
    }
    return NextResponse.json({ task })
  } catch {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: threadId, taskId } = await context.params
    const { content_html, due_at, status, visibility }: { content_html?: string | null; due_at?: string | null; status?: 'todo' | 'in_progress' | 'done'; visibility?: 'public' | 'private' } = await request.json()

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
    }

    const { data: existing, error: findErr } = await supabase
      .from('thread_tasks')
      .select('id, thread_id')
      .eq('id', taskId)
      .maybeSingle()
    if (findErr || !existing || existing.thread_id !== threadId) {
      return NextResponse.json({ error: 'Zadanie nie zostało znalezione' }, { status: 404 })
    }

    const update: any = {}
    if (content_html != null) update.content_html = content_html
    if (due_at === null || typeof due_at === 'string') update.due_at = due_at
    if (status === 'todo' || status === 'in_progress' || status === 'done') update.status = status
    if (visibility === 'public' || visibility === 'private') update.visibility = visibility

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Brak danych do aktualizacji' }, { status: 400 })
    }

    const { error } = await supabase
      .from('thread_tasks')
      .update(update)
      .eq('id', taskId)
    if (error) {
      return NextResponse.json({ error: 'Błąd podczas aktualizacji zadania' }, { status: 500 })
    }
    return NextResponse.json({ message: 'Zadanie zaktualizowane' })
  } catch {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: threadId, taskId } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
    }

    const { data: existing, error: findErr } = await supabase
      .from('thread_tasks')
      .select('id, thread_id')
      .eq('id', taskId)
      .maybeSingle()
    if (findErr || !existing || existing.thread_id !== threadId) {
      return NextResponse.json({ error: 'Zadanie nie zostało znalezione' }, { status: 404 })
    }

    const { error } = await supabase
      .from('thread_tasks')
      .delete()
      .eq('id', taskId)
    if (error) {
      return NextResponse.json({ error: 'Błąd podczas usuwania zadania' }, { status: 500 })
    }
    return NextResponse.json({ message: 'Zadanie usunięte' })
  } catch {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

