import { NextRequest, NextResponse } from 'next/server'
import { wtlClient } from '@/lib/wtl-client'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ trainingId: string }> }
) {
  try {
    const { trainingId } = await context.params
    console.log(`👥 Pobieranie studentów dla kursu ${trainingId} z WTL API...`)

    // Pobierz parametry z query string
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '[0,100]'
    const sort = searchParams.get('sort') || '["id", "ASC"]'
    const filter = searchParams.get('filter') || '[]'

    // Wywołaj WTL API
    const response = await wtlClient.get(
      `/training/${trainingId}/user/list?range=${range}&sort=${sort}&filter=${filter}`
    )

    if (!response.ok) {
      console.error('❌ Błąd WTL API:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Błąd pobierania studentów z WTL API' },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('📊 Otrzymane dane studentów z WTL API:', typeof data, data)

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
