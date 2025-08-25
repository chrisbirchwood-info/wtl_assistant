import fetch from 'node-fetch'

console.log('🧪 Testing Profile Access\n')

const BASE_URL = 'http://localhost:3001'

async function testProfileAccess() {
  try {
    console.log('🔍 Testing profile page access...')
    
    // Test 1: Sprawdź czy strona profilu jest dostępna
    const response = await fetch(`${BASE_URL}/profile`)
    console.log('📡 Profile page status:', response.status)
    
    if (response.ok) {
      const html = await response.text()
      console.log('✅ Profile page accessible')
      
      // Sprawdź czy zawiera błędy
      if (html.includes('error') || html.includes('Error')) {
        console.log('⚠️ Page contains error messages')
      }
      
    } else {
      console.log('❌ Profile page not accessible')
    }
    
    // Test 2: Sprawdź czy strona WTL jest dostępna
    console.log('\n🔍 Testing WTL page access...')
    const wtlResponse = await fetch(`${BASE_URL}/wtl`)
    console.log('📡 WTL page status:', wtlResponse.status)
    
    if (wtlResponse.ok) {
      console.log('✅ WTL page accessible')
    } else {
      console.log('❌ WTL page not accessible')
    }
    
    // Test 3: Sprawdź czy strona logowania jest dostępna
    console.log('\n🔍 Testing login page access...')
    const loginResponse = await fetch(`${BASE_URL}/auth/login`)
    console.log('📡 Login page status:', loginResponse.status)
    
    if (loginResponse.ok) {
      console.log('✅ Login page accessible')
    } else {
      console.log('❌ Login page not accessible')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testProfileAccess()
