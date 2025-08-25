import { NextRequest, NextResponse } from 'next/server'
import { wtlClient } from '@/lib/wtl-client'

export async function GET(request: NextRequest) {
  try {
    console.log('📚 Pobieranie listy kursów z WTL API...')

    // Pobierz parametry z query string
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '[0,50]'
    const sort = searchParams.get('sort') || '["name", "ASC"]'
    const filter = searchParams.get('filter') || '[]'

    // Wywołaj WTL API
    const response = await wtlClient.get(`/training/list?range=${range}&sort=${sort}&filter=${filter}`)

    if (!response.ok) {
      console.error('❌ Błąd WTL API:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Błąd pobierania kursów z WTL API' },
        { status: response.status }
      )
    }

    const trainings = await response.json()
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
