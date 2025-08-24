import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

console.log('🧪 Testing Specific Email: brzakalikoskar@gmail.com\n')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSpecificEmail() {
  try {
    const email = 'brzakalikoskar@gmail.com'
    
    console.log('🔍 Testing email:', email)
    
    // 1. Sprawdź czy użytkownik istnieje w Supabase
    console.log('\n📊 Checking Supabase...')
    const { data: supabaseUser, error: supabaseError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    
    if (supabaseError) {
      if (supabaseError.code === 'PGRST116') {
        console.log('❌ User NOT found in Supabase')
      } else {
        console.log('❌ Supabase error:', supabaseError.message)
      }
    } else {
      console.log('✅ User found in Supabase:', supabaseUser)
    }
    
    // 2. Sprawdź czy użytkownik istnieje w WTL (symulacja)
    console.log('\n🌐 Checking WTL (simulated)...')
    console.log('ℹ️ This would normally check WTL API')
    console.log('ℹ️ For now, assuming user exists in WTL')
    
    // 3. Przetestuj logowanie z tym emailem
    console.log('\n🔐 Testing login with this email...')
    
    const loginData = {
      email: email,
      otp: '555555'
    }
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    })
    
    console.log('📡 Response status:', response.status)
    
    const responseData = await response.json()
    console.log('📋 Response data:', JSON.stringify(responseData, null, 2))
    
    if (response.ok) {
      console.log('✅ Login successful!')
      
      // 4. Sprawdź czy użytkownik został utworzony w Supabase
      console.log('\n🔍 Checking if user was created in Supabase...')
      
      const { data: newUser, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()
      
      if (checkError) {
        console.log('❌ User still not found in Supabase after login')
      } else {
        console.log('✅ User successfully created in Supabase:', newUser)
        
        // 5. Sprawdź czy profil został utworzony
        if (newUser.role === 'student') {
          const { data: profile, error: profileError } = await supabase
            .from('student_profiles')
            .select('*')
            .eq('user_id', newUser.id)
          
          if (profileError) {
            console.log('⚠️ Student profile not found:', profileError.message)
          } else if (profile && profile.length > 0) {
            console.log('✅ Student profile created:', profile[0])
          } else {
            console.log('⚠️ Student profile not found')
          }
        }
      }
    } else {
      console.log('❌ Login failed:', responseData.error)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testSpecificEmail()
