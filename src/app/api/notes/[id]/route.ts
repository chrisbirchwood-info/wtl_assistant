import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { UpdateNoteRequest } from "@/types/notes"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Pobierz konkretną notatkę
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    const { data: note, error } = await supabase
      .from('notes')
      .select(`
        *,
        note_lesson_connections(*)
      `)
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Notatka nie została znaleziona" },
          { status: 404 }
        )
      }
      console.error("❌ Błąd pobierania notatki:", error)
      return NextResponse.json(
        { error: "Błąd podczas pobierania notatki" },
        { status: 500 }
      )
    }
    
    console.log("✅ Pobrano notatkę:", note.id)
    return NextResponse.json({ note })
    
  } catch (error) {
    console.error("❌ Błąd podczas pobierania notatki:", error)
    return NextResponse.json(
      { error: "Wystąpił nieoczekiwany błąd" },
      { status: 500 }
    )
  }
}

// Aktualizuj notatkę
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { title, content, lesson_ids, connection_types }: UpdateNoteRequest = await request.json()
    
    // Sprawdź czy notatka istnieje
    const { data: existingNote, error: checkError } = await supabase
      .from('notes')
      .select('id')
      .eq('id', id)
      .single()
    
    if (checkError || !existingNote) {
      return NextResponse.json(
        { error: "Notatka nie została znaleziona" },
        { status: 404 }
      )
    }
    
    // 1. Aktualizuj notatkę
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('notes')
        .update(updateData)
        .eq('id', id)
      
      if (updateError) {
        console.error("❌ Błąd aktualizacji notatki:", updateError)
        return NextResponse.json(
          { error: "Błąd podczas aktualizacji notatki" },
          { status: 500 }
        )
      }
    }
    
    // 2. Aktualizuj powiązania z lekcjami (jeśli są)
    if (lesson_ids !== undefined) {
      // Usuń istniejące powiązania
      await supabase
        .from('note_lesson_connections')
        .delete()
        .eq('note_id', id)
      
      // Utwórz nowe powiązania
      if (lesson_ids.length > 0) {
        const connections = lesson_ids.map((lesson_id: string, index: number) => ({
          note_id: id,
          lesson_id,
          connection_type: connection_types?.[index] || 'related'
        }))
        
        const { error: connectionError } = await supabase
          .from('note_lesson_connections')
          .insert(connections)
        
        if (connectionError) {
          console.error("❌ Błąd aktualizacji powiązań:", connectionError)
          return NextResponse.json(
            { error: "Błąd podczas aktualizacji powiązań z lekcjami" },
            { status: 500 }
          )
        }
      }
    }
    
    console.log("✅ Zaktualizowano notatkę:", id)
    return NextResponse.json({ 
      message: "Notatka została zaktualizowana pomyślnie" 
    })
    
  } catch (error) {
    console.error("❌ Błąd podczas aktualizacji notatki:", error)
    return NextResponse.json(
      { error: "Wystąpił nieoczekiwany błąd" },
      { status: 500 }
    )
  }
}

// Usuń notatkę
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    // Sprawdź czy notatka istnieje
    const { data: existingNote, error: checkError } = await supabase
      .from('notes')
      .select('id')
      .eq('id', id)
      .single()
    
    if (checkError || !existingNote) {
      return NextResponse.json(
        { error: "Notatka nie została znaleziona" },
        { status: 404 }
      )
    }
    
    // Usuń notatkę (powiązania zostaną usunięte automatycznie przez CASCADE)
    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      console.error("❌ Błąd usuwania notatki:", deleteError)
      return NextResponse.json(
        { error: "Błąd podczas usuwania notatki" },
        { status: 500 }
      )
    }
    
    console.log("✅ Usunięto notatkę:", id)
    return NextResponse.json({ 
      message: "Notatka została usunięta pomyślnie" 
    })
    
  } catch (error) {
    console.error("❌ Błąd podczas usuwania notatki:", error)
    return NextResponse.json(
      { error: "Wystąpił nieoczekiwany błąd" },
      { status: 500 }
    )
  }
}
