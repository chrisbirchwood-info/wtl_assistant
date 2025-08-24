import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🧪 Testing Profile Creation\n')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testProfileCreation() {
  try {
    // 1. Utwórz użytkownika testowego
    console.log('🔄 Creating test user...')
    
    const testUserData = {
      email: `test-profile-${Date.now()}@example.com`,
      username: 'Test Profile User',
      role: 'student'
    }
    
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert([testUserData])
      .select()
      .single()
    
    if (userError) {
      console.log('❌ User creation failed:', userError.message)
      return
    }
    
    console.log('✅ User created successfully:', newUser.id)
    
    // 2. Utwórz profil studenta
    console.log('🔄 Creating student profile...')
    
    const { data: profileData, error: profileError } = await supabase
      .from('student_profiles')
      .insert([{ user_id: newUser.id }])
    
    if (profileError) {
      console.log('❌ Profile creation failed:', profileError.message)
    } else {
      console.log('✅ Profile created successfully')
    }
    
    // 3. Sprawdź czy profil został utworzony
    console.log('🔍 Checking if profile exists...')
    
    const { data: profile, error: checkError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', newUser.id)
    
    if (checkError) {
      console.log('❌ Profile check failed:', checkError.message)
    } else if (profile && profile.length > 0) {
      console.log('✅ Profile found:', profile[0])
    } else {
      console.log('⚠️ Profile not found')
    }
    
    // 4. Usuń użytkownika testowego (profil zostanie usunięty automatycznie przez CASCADE)
    console.log('🧹 Cleaning up...')
    
    await supabase
      .from('users')
      .delete()
      .eq('id', newUser.id)
    
    console.log('✅ Cleanup completed')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testProfileCreation()
