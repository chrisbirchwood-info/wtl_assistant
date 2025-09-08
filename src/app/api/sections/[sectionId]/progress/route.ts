/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sectionId: string }> }
) {
  try {
    const { sectionId } = await context.params
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'Brak user_id' }, { status: 400 })
    }

    const { data: progress, error } = await supabase
      .from('lesson_section_progress')
      .select('*')
      .eq('section_id', sectionId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Błąd pobierania postępu' }, { status: 500 })
    }

    return NextResponse.json({ progress: progress || null })
  } catch (e) {
    console.error('Section progress GET error:', e)
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ sectionId: string }> }
) {
  try {
    const { sectionId } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
    }

    const url = new URL(request.url)
    const qpUserId = url.searchParams.get('user_id')
    const body = await request.json()
    const status = body?.status as 'todo' | 'in_progress' | 'done' | undefined
    const userId = (body?.user_id as string | undefined) || qpUserId

    if (!userId || !status || !['todo','in_progress','done'].includes(status)) {
      return NextResponse.json({ error: 'Brak user_id lub nieprawidłowy status' }, { status: 400 })
    }

    // Fetch existing progress to compute timestamps
    const { data: existing } = await supabase
      .from('lesson_section_progress')
      .select('*')
      .eq('section_id', sectionId)
      .eq('user_id', userId)
      .maybeSingle()

    const nowIso = new Date().toISOString()
    const update: any = { status }
    if (!existing && (status === 'in_progress' || status === 'done')) {
      update.started_at = nowIso
    } else if (existing && !existing.started_at && (status === 'in_progress' || status === 'done')) {
      update.started_at = nowIso
    }
    if (status === 'done') {
      update.completed_at = nowIso
    } else {
      update.completed_at = null
    }

    let res
    if (existing) {
      res = await supabase
        .from('lesson_section_progress')
        .update(update)
        .eq('id', existing.id)
        .select('*')
        .single()
    } else {
      res = await supabase
        .from('lesson_section_progress')
        .insert({ section_id: sectionId, user_id: userId, ...update })
        .select('*')
        .single()
    }

    if (res.error) {
      return NextResponse.json({ error: 'Błąd zapisu postępu' }, { status: 500 })
    }

    return NextResponse.json({ progress: res.data })
  } catch (e) {
    console.error('Section progress PATCH error:', e)
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

