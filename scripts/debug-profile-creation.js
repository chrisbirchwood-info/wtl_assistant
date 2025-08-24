import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🐛 Debugging Profile Creation\n')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugProfileCreation() {
  try {
    // 1. Sprawdź strukturę tabeli student_profiles
    console.log('🔍 Checking student_profiles table structure...')
    
    const { data: tableInfo, error: tableError } = await supabase
      .from('student_profiles')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.log('❌ Table error:', tableError.message)
      return
    }
    
    if (tableInfo.length > 0) {
      console.log('📋 Table columns:', Object.keys(tableInfo[0]))
      console.log('📋 Sample data:', tableInfo[0])
    } else {
      console.log('ℹ️ Table is empty')
    }
    
    // 2. Sprawdź czy można wstawić dane bez select()
    console.log('\n🧪 Testing insert without select()...')
    
    const testUserId = 'test-user-id-' + Date.now()
    const { error: insertError } = await supabase
      .from('student_profiles')
      .insert([{ user_id: testUserId }])
    
    if (insertError) {
      console.log('❌ Insert error:', insertError.message)
    } else {
      console.log('✅ Insert successful without select()')
      
      // Usuń testowy rekord
      await supabase
        .from('student_profiles')
        .delete()
        .eq('user_id', testUserId)
    }
    
    // 3. Sprawdź czy można wstawić dane z select()
    console.log('\n🧪 Testing insert with select()...')
    
    const testUserId2 = 'test-user-id-2-' + Date.now()
    const { data: insertData, error: insertError2 } = await supabase
      .from('student_profiles')
      .insert([{ user_id: testUserId2 }])
      .select()
    
    if (insertError2) {
      console.log('❌ Insert with select error:', insertError2.message)
    } else {
      console.log('✅ Insert with select successful')
      console.log('📋 Inserted data:', insertData)
      
      // Usuń testowy rekord
      await supabase
        .from('student_profiles')
        .delete()
        .eq('user_id', testUserId2)
    }
    
    // 4. Sprawdź czy można wstawić dane z select() i single()
    console.log('\n🧪 Testing insert with select().single()...')
    
    const testUserId3 = 'test-user-id-3-' + Date.now()
    try {
      const { data: insertData2, error: insertError3 } = await supabase
        .from('student_profiles')
        .insert([{ user_id: testUserId3 }])
        .select()
        .single()
      
      if (insertError3) {
        console.log('❌ Insert with select().single() error:', insertError3.message)
      } else {
        console.log('✅ Insert with select().single() successful')
        console.log('📋 Inserted data:', insertData2)
      }
      
      // Usuń testowy rekord
      await supabase
        .from('student_profiles')
        .delete()
        .eq('user_id', testUserId3)
        
    } catch (error) {
      console.log('❌ Insert with select().single() exception:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  }
}

debugProfileCreation()
