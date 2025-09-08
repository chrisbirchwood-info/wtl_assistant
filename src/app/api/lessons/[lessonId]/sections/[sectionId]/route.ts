/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string; sectionId: string }> }
) {
  try {
    const { lessonId, sectionId } = await context.params
    const url = new URL(request.url)
    const visibilityFor = url.searchParams.get('visibility_for') || 'teacher'
    const includeItems = url.searchParams.get('include_items') === 'true'
    const includeProgressFor = url.searchParams.get('include_progress_for')

    const query = supabase
      .from('lesson_sections')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('id', sectionId)
      .limit(1)
      .single()

    if (visibilityFor === 'student') {
      // apply after fetch check
    }

    const { data: section, error } = await query
    if (error || !section) {
      return NextResponse.json({ error: 'Sekcja nie znaleziona' }, { status: 404 })
    }

    if (visibilityFor === 'student' && section.visibility !== 'public') {
      return NextResponse.json({ error: 'Brak dostępu do sekcji' }, { status: 403 })
    }

    let items: any[] | undefined
    if (includeItems && section.type === 'checklist_task') {
      const { data: it } = await supabase
        .from('lesson_section_checklist_items')
        .select('*')
        .eq('section_id', sectionId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      items = it || []
    }

    let progress: any | undefined
    if (includeProgressFor) {
      const { data: prog } = await supabase
        .from('lesson_section_progress')
        .select('*')
        .eq('section_id', sectionId)
        .eq('user_id', includeProgressFor)
        .maybeSingle()
      progress = prog || null
    }

    return NextResponse.json({ section: { ...section, items, progress } })
  } catch (e) {
    console.error('Section GET error:', e)
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string; sectionId: string }> }
) {
  try {
    const { lessonId, sectionId } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
    }

    const body = await request.json()
    const allowed: any = {}
    if (typeof body.title === 'string') allowed.title = body.title
    if (typeof body.content_html === 'string' || body.content_html === null) allowed.content_html = body.content_html
    if (typeof body.position === 'number') allowed.position = body.position
    if (body.due_at === null || typeof body.due_at === 'string') allowed.due_at = body.due_at
    if (body.visibility === 'public' || body.visibility === 'private') allowed.visibility = body.visibility

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'Brak danych do aktualizacji' }, { status: 400 })
    }

    const { data: existing, error: findErr } = await supabase
      .from('lesson_sections')
      .select('id')
      .eq('id', sectionId)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (findErr || !existing) {
      return NextResponse.json({ error: 'Sekcja nie znaleziona' }, { status: 404 })
    }

    const { error } = await supabase
      .from('lesson_sections')
      .update(allowed)
      .eq('id', sectionId)

    if (error) {
      return NextResponse.json({ error: 'Błąd aktualizacji sekcji' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Sekcja zaktualizowana' })
  } catch (e) {
    console.error('Section PATCH error:', e)
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string; sectionId: string }> }
) {
  try {
    const { lessonId, sectionId } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
    }

    const { data: existing, error: findErr } = await supabase
      .from('lesson_sections')
      .select('id')
      .eq('id', sectionId)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (findErr || !existing) {
      return NextResponse.json({ error: 'Sekcja nie znaleziona' }, { status: 404 })
    }

    const { error } = await supabase
      .from('lesson_sections')
      .delete()
      .eq('id', sectionId)

    if (error) {
      return NextResponse.json({ error: 'Błąd usuwania sekcji' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Sekcja usunięta' })
  } catch (e) {
    console.error('Section DELETE error:', e)
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}
