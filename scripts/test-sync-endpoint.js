#!/usr/bin/env node

/**
 * Test sync endpoint bezpośrednio
 */

async function testSyncEndpoint() {
  try {
    console.log('🔍 Testowanie endpoint sync...\n')
    
    const teacherId = '7f22b763-65c5-4921-a2a0-cc9469638fab'
    const formId = '1FAlpQLSc9hxhXr-AA8P22qDe5Qw6OJ0LOwlr82xNBG4wp0VB' // Z URL który widziałem
    
    const url = 'http://localhost:3001/api/surveys/google/sync'
    
    console.log('📡 Wysyłam żądanie do:', url)
    console.log('📋 Payload:', { teacherId, formId })
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        teacherId: teacherId,
        formId: formId
      })
    })
    
    console.log('\n📊 Odpowiedź:')
    console.log('Status:', response.status)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))
    
    const data = await response.text()
    console.log('Body:', data)
    
    if (!response.ok) {
      console.log('\n❌ Błąd w odpowiedzi')
      try {
        const errorData = JSON.parse(data)
        console.log('Szczegóły błędu:', errorData)
      } catch {
        console.log('Raw response:', data)
      }
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas testu:', error.message)
  }
}

testSyncEndpoint()
