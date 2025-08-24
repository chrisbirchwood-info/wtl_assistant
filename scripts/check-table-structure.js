import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Checking Table Structure\n')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkTableStructure() {
  try {
    // Sprawdź strukturę tabeli users
    console.log('📋 Users table structure:')
    const { data: userColumns, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (userError) {
      console.log('❌ Users table error:', userError.message)
    } else if (userColumns.length > 0) {
      console.log('Columns:', Object.keys(userColumns[0]))
      console.log('Sample data:', userColumns[0])
    } else {
      console.log('Table is empty')
    }
    
    // Sprawdź strukturę tabeli student_profiles
    console.log('\n📋 Student_profiles table structure:')
    const { data: studentColumns, error: studentError } = await supabase
      .from('student_profiles')
      .select('*')
      .limit(1)
    
    if (studentError) {
      console.log('❌ Student_profiles table error:', studentError.message)
    } else if (studentColumns.length > 0) {
      console.log('Columns:', Object.keys(studentColumns[0]))
      console.log('Sample data:', studentColumns[0])
    } else {
      console.log('Table is empty')
    }
    
    // Sprawdź strukturę tabeli teacher_profiles
    console.log('\n📋 Teacher_profiles table structure:')
    const { data: teacherColumns, error: teacherError } = await supabase
      .from('teacher_profiles')
      .select('*')
      .limit(1)
    
    if (teacherError) {
      console.log('❌ Teacher_profiles table error:', teacherError.message)
    } else if (teacherColumns.length > 0) {
      console.log('Columns:', Object.keys(teacherColumns[0]))
      console.log('Sample data:', teacherColumns[0])
    } else {
      console.log('Table is empty')
    }
    
    // Sprawdź strukturę tabeli user_sync_log
    console.log('\n📋 User_sync_log table structure:')
    const { data: syncColumns, error: syncError } = await supabase
      .from('user_sync_log')
      .select('*')
      .limit(1)
    
    if (syncError) {
      console.log('❌ User_sync_log table error:', syncError.message)
    } else if (syncColumns.length > 0) {
      console.log('Columns:', Object.keys(syncColumns[0]))
      console.log('Sample data:', syncColumns[0])
    } else {
      console.log('Table is empty')
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message)
  }
}

checkTableStructure()
