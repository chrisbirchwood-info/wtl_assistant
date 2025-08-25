import { NextRequest, NextResponse } from 'next/server'
import { wtlClient } from '@/lib/wtl-client'

export async function GET(
  request: NextRequest,
  { params }: { params: { trainingId: string } }
) {
  try {
    const { trainingId } = params
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

    const users = await response.json()
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
