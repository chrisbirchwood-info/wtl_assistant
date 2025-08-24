import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Załaduj zmienne środowiskowe
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔗 Testing Supabase connection...')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    console.log('\n🔄 Testing database connection...')
    
    // Test 1: Sprawdź połączenie
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log('❌ Database connection failed:', error.message)
      
      // Sprawdź czy tabela istnieje
      if (error.message.includes('relation "users" does not exist')) {
        console.log('ℹ️ Table "users" does not exist - need to run migrations')
        return false
      }
      
      return false
    }
    
    console.log('✅ Database connection successful')
    console.log('📊 Users table accessible')
    
    // Test 2: Sprawdź strukturę tabeli
    const { data: tableInfo, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.log('❌ Table structure error:', tableError.message)
      return false
    }
    
    console.log('✅ Table structure accessible')
    console.log('📋 Current columns:', Object.keys(tableInfo[0] || {}))
    
    return true
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message)
    return false
  }
}

async function checkTables() {
  try {
    console.log('\n🔍 Checking required tables...')
    
    const requiredTables = ['users', 'teacher_profiles', 'student_profiles', 'user_sync_log']
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
    
    console.log('✅ Existing tables:', existingTables)
    console.log('❌ Missing tables:', missingTables)
    
    return missingTables.length === 0
    
  } catch (error) {
    console.error('❌ Table check failed:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Supabase Connection Test\n')
  
  const connectionOk = await testConnection()
  
  if (connectionOk) {
    const tablesOk = await checkTables()
    
    if (tablesOk) {
      console.log('\n🎉 All tests passed! Supabase is ready.')
    } else {
      console.log('\n⚠️ Connection OK but tables missing. Need to run migrations.')
    }
  } else {
    console.log('\n❌ Connection failed. Check your configuration.')
  }
}

main().catch(console.error)
