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

    let query = supabase
      .from('thread_tasks')
      // Include content_html so the UI can render saved content
      .select('id, thread_id, created_by, created_at, updated_at, visibility, status, due_at, content_html')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })

    if (visibilityFor === 'student') {
      query = query.eq('visibility', 'public')
    }

    const { data: tasks, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Błąd podczas pobierania zadań' }, { status: 500 })
    }
    return NextResponse.json({ tasks: tasks || [] })
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
    const { content_html, due_at, visibility }: { content_html?: string; due_at?: string | null; visibility?: 'public' | 'private' } = await request.json()

    if (!content_html || !content_html.trim()) {
      return NextResponse.json({ error: 'Treść zadania jest wymagana' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
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

    const url = new URL(request.url)
    const createdBy = url.searchParams.get('created_by') || url.searchParams.get('user_id') || null

    const payload: any = {
      thread_id: threadId,
      content_html,
      created_by: createdBy,
      visibility: visibility === 'public' ? 'public' : 'private',
      status: 'todo',
      due_at: due_at || null,
    }

    const { data: task, error } = await supabase
      .from('thread_tasks')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Błąd podczas zapisu zadania' }, { status: 500 })
    }

    return NextResponse.json({ task }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}
