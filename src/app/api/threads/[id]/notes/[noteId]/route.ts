/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: threadId, noteId } = await context.params
    const { content_html, visibility }: { content_html?: string; visibility?: 'public' | 'private' } = await request.json()

    if ((content_html == null || content_html.replace(/<[^>]*>/g, '').trim().length === 0) && !visibility) {
      return NextResponse.json({ error: 'Brak danych do aktualizacji' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
    }

    // Ensure the note belongs to the thread
    const { data: existing, error: findErr } = await supabase
      .from('thread_notes')
      .select('id, thread_id')
      .eq('id', noteId)
      .maybeSingle()

    if (findErr || !existing || existing.thread_id !== threadId) {
      return NextResponse.json({ error: 'Notatka nie została znaleziona' }, { status: 404 })
    }

    const update: any = {}
    if (content_html != null) update.content_html = content_html
    if (visibility === 'public' || visibility === 'private') update.visibility = visibility

    const { error } = await supabase
      .from('thread_notes')
      .update(update)
      .eq('id', noteId)

    if (error) {
      return NextResponse.json({ error: 'Błąd podczas aktualizacji notatki' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Notatka zaktualizowana' })
  } catch {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: threadId, noteId } = await context.params

    const { data: note, error } = await supabase
      .from('thread_notes')
      .select('*')
      .eq('id', noteId)
      .maybeSingle()

    if (error || !note || note.thread_id !== threadId) {
      return NextResponse.json({ error: 'Notatka nie została znaleziona' }, { status: 404 })
    }

    return NextResponse.json({ note })
  } catch {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: threadId, noteId } = await context.params

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
    }

    const { data: existing, error: findErr } = await supabase
      .from('thread_notes')
      .select('id, thread_id')
      .eq('id', noteId)
      .maybeSingle()

    if (findErr || !existing || existing.thread_id !== threadId) {
      return NextResponse.json({ error: 'Notatka nie została znaleziona' }, { status: 404 })
    }

    const { error } = await supabase
      .from('thread_notes')
      .delete()
      .eq('id', noteId)

    if (error) {
      return NextResponse.json({ error: 'Błąd podczas usuwania notatki' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Notatka usunięta' })
  } catch {
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

