import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Załaduj zmienne środowiskowe
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🧪 Testing Login Flow\n')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLoginFlow() {
  try {
    console.log('🔗 Testing Supabase connection...')
    
    // Test 1: Sprawdź połączenie
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      console.log('❌ Database connection failed:', connectionError.message)
      return false
    }
    
    console.log('✅ Database connection successful')
    
    // Test 2: Sprawdź strukturę tabeli users
    const { data: userColumns, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (userError) {
      console.log('❌ Users table error:', userError.message)
      return false
    }
    
    if (userColumns.length > 0) {
      const columns = Object.keys(userColumns[0])
      console.log('📋 Users table columns:', columns)
      
      const requiredColumns = ['role', 'wtl_user_id', 'wtl_last_sync', 'wtl_sync_status']
      const missingColumns = requiredColumns.filter(col => !columns.includes(col))
      
      if (missingColumns.length > 0) {
        console.log('⚠️ Missing columns in users table:', missingColumns)
        console.log('💡 You need to run migrations first')
        return false
      } else {
        console.log('✅ All required columns exist in users table')
      }
    } else {
      console.log('ℹ️ Users table is empty (no users yet)')
    }
    
    // Test 3: Sprawdź tabele profili
    const requiredTables = ['teacher_profiles', 'student_profiles', 'user_sync_log']
    const existingTables = []
    const missingTables = []
    
    for (const table of requiredTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1)
        
        if (error) {
          missingTables.push(table)
        } else {
          existingTables.push(table)
        }
      } catch (error) {
        missingTables.push(table)
      }
    }
    
    console.log('\n📊 Table status:')
    console.log('✅ Existing tables:', existingTables)
    
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables)
      console.log('💡 You need to run migrations first')
      return false
    } else {
      console.log('✅ All required tables exist')
    }
    
    // Test 4: Sprawdź czy można utworzyć użytkownika testowego
    console.log('\n🧪 Testing user creation...')
    
    const testEmail = `test-${Date.now()}@example.com`
    const testUserData = {
      email: testEmail,
      username: 'Test User',
      role: 'student'
    }
    
    try {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([testUserData])
        .select()
        .single()
      
      if (createError) {
        console.log('❌ User creation failed:', createError.message)
        return false
      }
      
      console.log('✅ Test user created successfully:', newUser.id)
      
      // Sprawdź czy profil został utworzony
      const { data: profile, error: profileError } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', newUser.id)
      
      if (profileError) {
        console.log('⚠️ Student profile not created:', profileError.message)
      } else if (profile && profile.length > 0) {
        console.log('✅ Student profile created successfully')
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
      console.error('❌ User creation test failed:', error.message)
      return false
    }
    
    console.log('\n🎉 All tests passed! Login flow is ready.')
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

async function main() {
  const success = await testLoginFlow()
  
  if (success) {
    console.log('\n✨ Your system is ready for automatic user creation on login!')
    console.log('\n📋 Next steps:')
    console.log('1. Start your Next.js app: npm run dev')
    console.log('2. Try logging in with a valid email and OTP: 555555')
    console.log('3. Check the console logs for the sync process')
    console.log('4. Check Supabase for the new user and profile')
  } else {
    console.log('\n❌ System is not ready. Please run migrations first.')
    console.log('📋 Go to Supabase Dashboard -> SQL Editor and run the migration manually.')
  }
}

main().catch(console.error)
