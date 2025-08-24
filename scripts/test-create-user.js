import { createUser, getUserByEmail } from '../src/lib/supabase.ts'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

console.log('🧪 Testing createUser function\n')

async function testCreateUser() {
  try {
    const testEmail = `test-create-${Date.now()}@example.com`
    const testUserData = {
      email: testEmail,
      username: 'Test Create User',
      role: 'student'
    }
    
    console.log('🔄 Creating test user:', testUserData)
    
    // Utwórz użytkownika
    const newUser = await createUser(testUserData)
    
    console.log('✅ User created successfully:', newUser)
    
    // Sprawdź czy użytkownik został utworzony
    const retrievedUser = await getUserByEmail(testEmail)
    
    if (retrievedUser) {
      console.log('✅ User retrieved successfully:', retrievedUser)
    } else {
      console.log('❌ User not found after creation')
    }
    
    // Sprawdź czy profil został utworzony
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    const { data: profile, error: profileError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', newUser.id)
    
    if (profileError) {
      console.log('❌ Profile check error:', profileError.message)
    } else if (profile && profile.length > 0) {
      console.log('✅ Student profile found:', profile[0])
    } else {
      console.log('⚠️ Student profile not found')
    }
    
    // Usuń użytkownika testowego
    await supabase
      .from('users')
      .delete()
      .eq('id', newUser.id)
    
    console.log('🧹 Test user cleaned up')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

testCreateUser()
