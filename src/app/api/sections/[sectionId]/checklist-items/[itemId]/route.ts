/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ sectionId: string; itemId: string }> }
) {
  try {
    const { sectionId, itemId } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
    }

    const body = await request.json()
    const update: any = {}
    if (typeof body.label === 'string') update.label = body.label
    if (typeof body.position === 'number') update.position = body.position

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Brak danych do aktualizacji' }, { status: 400 })
    }

    // ensure item belongs to section
    const { data: existing, error: findErr } = await supabase
      .from('lesson_section_checklist_items')
      .select('id, section_id')
      .eq('id', itemId)
      .maybeSingle()

    if (findErr || !existing || existing.section_id !== sectionId) {
      return NextResponse.json({ error: 'Pozycja nie znaleziona' }, { status: 404 })
    }

    const { error } = await supabase
      .from('lesson_section_checklist_items')
      .update(update)
      .eq('id', itemId)

    if (error) {
      return NextResponse.json({ error: 'Błąd aktualizacji pozycji' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Pozycja zaktualizowana' })
  } catch (e) {
    console.error('Checklist item PATCH error:', e)
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sectionId: string; itemId: string }> }
) {
  try {
    const { sectionId, itemId } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
    }

    const { data: existing, error: findErr } = await supabase
      .from('lesson_section_checklist_items')
      .select('id, section_id')
      .eq('id', itemId)
      .maybeSingle()

    if (findErr || !existing || existing.section_id !== sectionId) {
      return NextResponse.json({ error: 'Pozycja nie znaleziona' }, { status: 404 })
    }

    const { error } = await supabase
      .from('lesson_section_checklist_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      return NextResponse.json({ error: 'Błąd usuwania pozycji' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Pozycja usunięta' })
  } catch (e) {
    console.error('Checklist item DELETE error:', e)
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

