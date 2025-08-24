import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

console.log('🧪 Testing Login Endpoint\n')

const BASE_URL = 'http://localhost:3000'

async function testLoginEndpoint() {
  try {
    console.log('🔗 Testing login endpoint...')
    
    const testEmail = `test-login-${Date.now()}@example.com`
    const loginData = {
      email: testEmail,
      otp: '555555'
    }
    
    console.log('📧 Test data:', loginData)
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    })
    
    console.log('📡 Response status:', response.status)
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
    
    const responseData = await response.json()
    console.log('📋 Response data:', JSON.stringify(responseData, null, 2))
    
    if (response.ok) {
      console.log('✅ Login successful!')
      
      if (responseData.user) {
        console.log('👤 User created:', responseData.user)
      }
      
      if (responseData.session) {
        console.log('🔑 Session token generated')
      }
    } else {
      console.log('❌ Login failed:', responseData.error)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the app is running: npm run dev')
    }
  }
}

async function checkAppStatus() {
  try {
    console.log('🔍 Checking if app is running...')
    
    const response = await fetch(`${BASE_URL}/api/wtl/test`)
    const data = await response.json()
    
    console.log('✅ App is running, test endpoint response:', data)
    return true
    
  } catch (error) {
    console.log('❌ App is not running or not accessible')
    return false
  }
}

async function main() {
  const isRunning = await checkAppStatus()
  
  if (isRunning) {
    await testLoginEndpoint()
  } else {
    console.log('\n💡 Please start the app first: npm run dev')
  }
}

main()
