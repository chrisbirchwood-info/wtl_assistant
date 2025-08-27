import { NextRequest, NextResponse } from 'next/server'
import { wtlClient } from '@/lib/wtl-client'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ trainingId: string }> }
) {
  try {
    const { trainingId } = await context.params
    console.log(`👥 Pobieranie studentów dla kursu ${trainingId} z WTL API...`)
    console.log('🔑 WTL_API_URL:', process.env.WTL_API_URL)
    console.log('🔑 WTL_API_KEY:', process.env.WTL_API_KEY ? 'Ustawiony' : 'BRAK!')

    // Sprawdź czy mamy klucz API
    if (!process.env.WTL_API_KEY) {
      console.error('❌ BRAK WTL_API_KEY w zmiennych środowiskowych!')
      return NextResponse.json(
        { error: 'Brak konfiguracji WTL API - skontaktuj się z administratorem' },
        { status: 500 }
      )
    }

    // Pobierz parametry z query string
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '[0,100]'
    const sort = searchParams.get('sort') || '["id", "ASC"]'
    const filter = searchParams.get('filter') || '[]'

    console.log('🌐 Wywołuję WTL API z parametrami:', { trainingId, range, sort, filter })

    // Wywołaj WTL API
    const response = await wtlClient.get(
      `/training/${trainingId}/user/list?range=${range}&sort=${sort}&filter=${filter}`
    )

    console.log('📡 Odpowiedź WTL API:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers ? Object.keys(response.headers) : 'Brak headers'
    })

    if (response.status >= 400) {
      console.error('❌ Błąd WTL API:', response.status, response.statusText)
      return NextResponse.json(
        { error: `Błąd WTL API: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = response.data
    console.log('📊 Otrzymane dane studentów z WTL API:', typeof data, data)

    // Sprawdź czy dane zawierają błąd
    if (data && data.error) {
      console.error('❌ WTL API zwróciło błąd:', data.error)
      return NextResponse.json(
        { error: `Błąd WTL API: ${data.error}` },
        { status: 400 }
      )
    }

    // Sprawdź czy dane są tablicą
    let users = []
    if (Array.isArray(data)) {
      users = data
    } else if (data && typeof data === 'object') {
      // Jeśli to obiekt, spróbuj znaleźć tablicę użytkowników
      if (Array.isArray(data.data)) {
        users = data.data
      } else if (Array.isArray(data.users)) {
        users = data.users
      } else if (Array.isArray(data.students)) {
        users = data.students
      } else if (Array.isArray(data.members)) {
        users = data.members
      } else {
        console.warn('⚠️ Nieznana struktura danych studentów z WTL API:', data)
        users = []
      }
    } else {
      console.warn('⚠️ Otrzymane dane studentów nie są tablicą ani obiektem:', data)
      users = []
    }

    console.log(`✅ Pobrano ${users.length} studentów dla kursu ${trainingId}`)
    return NextResponse.json(users)

  } catch (error) {
    console.error('❌ Błąd podczas pobierania studentów:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania studentów' },
      { status: 500 }
    )
  }
}
