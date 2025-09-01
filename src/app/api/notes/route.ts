import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { CreateNoteRequest, UpdateNoteRequest } from "@/types/notes"
import wtlClient from "@/lib/wtl-client"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Pobierz wszystkie notatki użytkownika
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lesson_id')
    const includeConnections = searchParams.get('include_connections') === 'true'
    
    let query = supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (lessonId) {
      // Pobierz notatki powiązane z konkretną lekcją
      query = supabase
        .from('notes')
        .select(`
          *,
          note_lesson_connections!inner(*)
        `)
        .eq('note_lesson_connections.lesson_id', lessonId)
        .order('created_at', { ascending: false })
    } else if (includeConnections) {
      // Pobierz notatki z powiązaniami
      query = supabase
        .from('notes')
        .select(`
          *,
          note_lesson_connections(*)
        `)
        .order('created_at', { ascending: false })
    }
    
    const { data: notes, error } = await query
    
    if (error) {
      console.error("❌ Błąd pobierania notatek:", error)
      return NextResponse.json(
        { error: "Błąd podczas pobierania notatek" },
        { status: 500 }
      )
    }
    
    console.log("✅ Pobrano notatki:", notes?.length || 0)
    return NextResponse.json({ notes: notes || [] })
    
  } catch (error) {
    console.error("❌ Błąd podczas pobierania notatek:", error)
    return NextResponse.json(
      { error: "Wystąpił nieoczekiwany błąd" },
      { status: 500 }
    )
  }
}

// Utwórz nową notatkę
export async function POST(request: NextRequest) {
  try {
    const { title, content, lesson_ids, connection_types }: CreateNoteRequest = await request.json()
    
    if (!title || !content) {
      return NextResponse.json(
        { error: "Tytuł i treść są wymagane" },
        { status: 400 }
      )
    }
    
    // Pobierz user_id z nagłówka autoryzacji
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Brak autoryzacji" },
        { status: 401 }
      )
    }
    
    // TODO: Zweryfikuj token i pobierz user_id z Supabase Auth
    // Na razie używamy tymczasowego rozwiązania - pobierz z query params
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')
    const trainingId = url.searchParams.get('trainingId') || url.searchParams.get('training_id')
    
    if (!userId) {
      return NextResponse.json(
        { error: "Brak user_id" },
        { status: 400 }
      )
    }
    
    const user_id = userId

    // Opcjonalna walidacja: jeśli mamy trainingId i lesson_ids, ogranicz do lekcji danego kursu
    if (trainingId && lesson_ids && lesson_ids.length > 0) {
      try {
        const allowedResp = await wtlClient.getLessons(trainingId)
        const allowed = new Set((allowedResp.data || []).map((l: any) => String(l.id)))
        const invalid = (lesson_ids || []).filter((id) => !allowed.has(String(id)))
        if (invalid.length > 0) {
          return NextResponse.json(
            { error: `Lekcje nie należą do wybranego kursu: ${invalid.join(', ')}` },
            { status: 400 }
          )
        }
      } catch (e) {
        return NextResponse.json(
          { error: 'Nie udało się zweryfikować lekcji dla kursu' },
          { status: 400 }
        )
      }
    }
    
    // 1. Utwórz notatkę
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({ 
        title, 
        content, 
        user_id 
      })
      .select()
      .single()
    
    if (noteError) {
      console.error("❌ Błąd tworzenia notatki:", noteError)
      return NextResponse.json(
        { error: "Błąd podczas tworzenia notatki" },
        { status: 500 }
      )
    }
    
    // 2. Utwórz powiązania z lekcjami (jeśli są)
    if (lesson_ids && lesson_ids.length > 0) {
      const connections = lesson_ids.map((lesson_id: string, index: number) => ({
        note_id: note.id,
        lesson_id,
        connection_type: connection_types?.[index] || 'related'
      }))
      
      const { error: connectionError } = await supabase
        .from('note_lesson_connections')
        .insert(connections)
      
      if (connectionError) {
        console.error("❌ Błąd tworzenia powiązań:", connectionError)
        // Usuń notatkę jeśli nie udało się utworzyć powiązań
        await supabase.from('notes').delete().eq('id', note.id)
        return NextResponse.json(
          { error: "Błąd podczas tworzenia powiązań z lekcjami" },
          { status: 500 }
        )
      }
    }
    
    console.log("✅ Utworzono notatkę:", note.id)
    return NextResponse.json({ 
      note,
      message: "Notatka została utworzona pomyślnie" 
    }, { status: 201 })
    
  } catch (error) {
    console.error("❌ Błąd podczas tworzenia notatki:", error)
    return NextResponse.json(
      { error: "Wystąpił nieoczekiwany błąd" },
      { status: 500 }
    )
  }
}
