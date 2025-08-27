import { NextRequest, NextResponse } from 'next/server'
import { wtlClient } from '@/lib/wtl-client'

export async function GET(request: NextRequest) {
  try {
    console.log('📚 Pobieranie listy kursów z WTL API...')
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
    const range = searchParams.get('range') || '[0,50]'
    const sort = searchParams.get('sort') || '["name", "ASC"]'
    const filter = searchParams.get('filter') || '[]'

    console.log('🌐 Wywołuję WTL API z parametrami:', { range, sort, filter })

    // Wywołaj WTL API
    const response = await wtlClient.get(`/training/list?range=${range}&sort=${sort}&filter=${filter}`)

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
    console.log('📊 Otrzymane dane z WTL API:', typeof data, data)

    // Sprawdź czy dane zawierają błąd
    if (data && data.error) {
      console.error('❌ WTL API zwróciło błąd:', data.error)
      return NextResponse.json(
        { error: `Błąd WTL API: ${data.error}` },
        { status: 400 }
      )
    }

    // Sprawdź czy dane są tablicą
    let trainings = []
    if (Array.isArray(data)) {
      trainings = data
    } else if (data && typeof data === 'object') {
      // Jeśli to obiekt, spróbuj znaleźć tablicę kursów
      if (Array.isArray(data.data)) {
        trainings = data.data
      } else if (Array.isArray(data.trainings)) {
        trainings = data.trainings
      } else if (Array.isArray(data.courses)) {
        trainings = data.courses
      } else {
        console.warn('⚠️ Nieznana struktura danych z WTL API:', data)
        trainings = []
      }
    } else {
      console.warn('⚠️ Otrzymane dane nie są tablicą ani obiektem:', data)
      trainings = []
    }

    console.log(`✅ Pobrano ${trainings.length} kursów z WTL API`)
    return NextResponse.json(trainings)

  } catch (error) {
    console.error('❌ Błąd podczas pobierania kursów:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania kursów' },
      { status: 500 }
    )
  }
}
