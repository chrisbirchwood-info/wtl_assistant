#!/usr/bin/env node

/**
 * Debug błędu synchronizacji ankiet
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function debugSyncError() {
  try {
    console.log('🔍 Debug błędu synchronizacji...\n')
    
    // 1. Sprawdź OAuth token
    console.log('1. OAuth token:')
    const { data: token, error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .select('*')
      .eq('user_id', '7f22b763-65c5-4921-a2a0-cc9469638fab')
      .eq('provider', 'google')
      .single()
    
    if (tokenError || !token) {
      console.log('❌ Brak tokenu OAuth')
      return
    }
    
    console.log('✅ Token OAuth istnieje')
    console.log(`   - Scope: ${token.scope}`)
    console.log(`   - Created: ${token.created_at}`)
    
    // 2. Sprawdź czy tabele są gotowe
    console.log('\n2. Sprawdzam tabele docelowe...')
    
    // Test survey_forms
    try {
      const { error: formTest } = await supabase
        .from('survey_forms')
        .insert({
          form_id: 'test-form-debug',
          teacher_id: '7f22b763-65c5-4921-a2a0-cc9469638fab',
          title: 'Test'
        })
      
      if (formTest) {
        console.log('❌ Problem z survey_forms:', formTest.message)
      } else {
        console.log('✅ survey_forms - OK')
        // Usuń test
        await supabase.from('survey_forms').delete().eq('form_id', 'test-form-debug')
      }
    } catch (e) {
      console.log('❌ survey_forms niedostępne')
    }
    
    // Test survey_responses  
    try {
      const { error: respTest } = await supabase
        .from('survey_responses')
        .select('count')
        .limit(1)
      
      if (respTest) {
        console.log('❌ Problem z survey_responses:', respTest.message)
      } else {
        console.log('✅ survey_responses - OK')
      }
    } catch (e) {
      console.log('❌ survey_responses niedostępne')
    }
    
    // Test survey_answers
    try {
      const { error: ansTest } = await supabase
        .from('survey_answers')
        .select('count')
        .limit(1)
      
      if (ansTest) {
        console.log('❌ Problem z survey_answers:', ansTest.message)
      } else {
        console.log('✅ survey_answers - OK')
      }
    } catch (e) {
      console.log('❌ survey_answers niedostępne')
    }
    
    console.log('\n3. Sprawdź ID formularza:')
    console.log('   - Z URL: https://docs.google.com/forms/d/e/1FAlpQLSc9hxhXr-AA8P22qDe5Qw6OJ0LOwlr82xNBG4wp0VB...')
    console.log('   - ID to: 1FAlpQLSc9hxhXr-AA8P22qDe5Qw6OJ0LOwlr82xNBG4wp0VB...')
    console.log('   - Sprawdź czy to pełne ID (nie skrócone)')
    
  } catch (error) {
    console.error('❌ Błąd podczas debug:', error.message)
  }
}

debugSyncError()
