/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ sectionId: string }> }
) {
  try {
    const { sectionId } = await context.params
    const { data: items, error } = await supabase
      .from('lesson_section_checklist_items')
      .select('*')
      .eq('section_id', sectionId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Błąd pobierania pozycji' }, { status: 500 })
    }

    return NextResponse.json({ items: items || [] })
  } catch (e) {
    console.error('Checklist items GET error:', e)
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sectionId: string }> }
) {
  try {
    const { sectionId } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
    }

    const body = await request.json()
    const items = Array.isArray(body?.items)
      ? body.items
      : (body?.label ? [{ label: body.label, position: body.position }] : [])

    const toInsert = items
      .map((it: any, idx: number) => ({
        section_id: sectionId,
        label: String(it.label || '').trim(),
        position: typeof it.position === 'number' ? it.position : idx,
      }))
      .filter((x: any) => x.label.length > 0)

    if (toInsert.length === 0) {
      return NextResponse.json({ error: 'Brak pozycji do dodania' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('lesson_section_checklist_items')
      .insert(toInsert)
      .select('*')

    if (error) {
      return NextResponse.json({ error: 'Błąd tworzenia pozycji' }, { status: 500 })
    }

    return NextResponse.json({ items: data || [] }, { status: 201 })
  } catch (e) {
    console.error('Checklist items POST error:', e)
    return NextResponse.json({ error: 'Wystąpił nieoczekiwany błąd' }, { status: 500 })
  }
}

