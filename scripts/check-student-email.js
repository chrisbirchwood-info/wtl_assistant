#!/usr/bin/env node

/**
 * Sprawdź gdzie jest email ucznia
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkStudentEmail() {
  try {
    console.log('🔍 Sprawdzam gdzie jest email ucznia...\n')
    
    // Z URL widziałem że thread należy do: brzakalikoskar@gmail.com
    const studentEmail = 'brzakalikoskar@gmail.com'
    
    // 1. Sprawdź auth.users
    console.log('1. Sprawdzam auth.users...')
    const { data: authUser, error: authError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', studentEmail)
      .single()
    
    if (authError) {
      console.log('❌ Błąd auth.users:', authError.message)
    } else if (authUser) {
      console.log('✅ Znaleziono w auth.users:', authUser.id, authUser.email)
    } else {
      console.log('❌ Nie znaleziono w auth.users')
    }
    
    // 2. Sprawdź public.users
    console.log('\n2. Sprawdzam public.users...')
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', studentEmail)
      .single()
    
    if (publicError) {
      console.log('❌ Błąd public.users:', publicError.message)
    } else if (publicUser) {
      console.log('✅ Znaleziono w public.users:', publicUser.id, publicUser.email)
    } else {
      console.log('❌ Nie znaleziono w public.users')
    }
    
    // 3. Sprawdź thread owner
    console.log('\n3. Sprawdzam właściciela wątku...')
    const threadId = 'da69d5ed-4be3-4a3a-b27d-257'  // Z URL
    
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('user_id')
      .eq('id', threadId)
      .single()
    
    if (threadError) {
      console.log('❌ Błąd threads:', threadError.message)
    } else if (thread) {
      console.log('✅ Thread user_id:', thread.user_id)
      
      // Sprawdź tego usera w obu tabelach
      const { data: threadAuthUser } = await supabase
        .from('auth.users')
        .select('id, email')
        .eq('id', thread.user_id)
        .single()
      
      const { data: threadPublicUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', thread.user_id)
        .single()
      
      console.log('   - W auth.users:', threadAuthUser?.email || 'nie znaleziono')
      console.log('   - W public.users:', threadPublicUser?.email || 'nie znaleziono')
    }
    
  } catch (error) {
    console.error('❌ Błąd:', error.message)
  }
}

checkStudentEmail()
