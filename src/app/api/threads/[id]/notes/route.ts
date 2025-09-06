/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await context.params
    // Determine viewer role to filter visibility
    const url = new URL(_request.url)
    const visibilityFor = url.searchParams.get('visibility_for') || 'teacher'

    let query = supabase
      .from('thread_notes')
      .select('id, thread_id, created_by, created_at, updated_at, visibility')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })

    if (visibilityFor === 'student') {
      query = query.eq('visibility', 'public')
    }

    const { data: notes, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Błąd podczas pobierania notatek' }, { status: 500 })
    }

    return NextResponse.json({ notes: notes || [] })
  } catch {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await context.params
    const { content_html, visibility }: { content_html?: string; visibility?: 'public' | 'private' } = await request.json()

    if (!content_html || !content_html.trim()) {
      return NextResponse.json({ error: 'Treść notatki jest wymagana' }, { status: 400 })
    }

    // Basic auth check (mirrors other endpoints)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
    }

    const url = new URL(request.url)
    const createdBy = url.searchParams.get('created_by') || url.searchParams.get('user_id') || null

    // Ensure thread exists
    const { data: thread, error: threadErr } = await supabase
      .from('threads')
      .select('id')
      .eq('id', threadId)
      .maybeSingle()

    if (threadErr || !thread) {
      return NextResponse.json({ error: 'Wątek nie został znaleziony' }, { status: 404 })
    }

    const { data: note, error } = await supabase
      .from('thread_notes')
      .insert({ thread_id: threadId, content_html, created_by: createdBy, visibility: visibility || 'public' })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Błąd podczas zapisu notatki' }, { status: 500 })
    }

    return NextResponse.json({ note }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}
