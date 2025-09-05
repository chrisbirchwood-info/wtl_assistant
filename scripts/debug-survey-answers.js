#!/usr/bin/env node

/**
 * Debug dlaczego odpowiedzi z ankiety są null
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function debugSurveyAnswers() {
  try {
    console.log('🔍 Debug odpowiedzi z ankiety...\n')
    
    const threadId = 'da69d5ed-4be3-4a3a-b27d-257bee9e2293'
    
    // 1. Sprawdź połączenia
    console.log('1. Sprawdzam połączenia thread-survey...')
    const { data: connections, error: connError } = await supabase
      .from('thread_survey_connections')
      .select('*')
      .eq('thread_id', threadId)
    
    if (connError) {
      console.log('❌ Błąd:', connError.message)
      return
    }
    
    console.log(`✅ Znaleziono ${connections?.length || 0} połączeń:`)
    connections?.forEach(conn => {
      console.log(`   - Connection: ${conn.id}`)
      console.log(`   - Form: ${conn.form_id}`)
      console.log(`   - Response: ${conn.survey_response_id}`)
      console.log(`   - Status: ${conn.connection_type}`)
    })
    
    if (!connections || connections.length === 0) {
      console.log('❌ Brak połączeń')
      return
    }
    
    // 2. Sprawdź odpowiedzi
    console.log('\n2. Sprawdzam odpowiedzi...')
    for (const conn of connections) {
      if (conn.survey_response_id) {
        console.log(`\nResponse ID: ${conn.survey_response_id}`)
        
        const { data: response, error: respError } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('id', conn.survey_response_id)
          .single()
        
        if (respError) {
          console.log('❌ Błąd response:', respError.message)
        } else {
          console.log('✅ Response data:', response)
        }
        
        // Sprawdź answers
        const { data: answers, error: answersError } = await supabase
          .from('survey_answers')
          .select('*')
          .eq('response_id', conn.survey_response_id)
        
        if (answersError) {
          console.log('❌ Błąd answers:', answersError.message)
        } else {
          console.log(`✅ Znaleziono ${answers?.length || 0} odpowiedzi:`)
          answers?.forEach(answer => {
            console.log(`   - Q: ${answer.question_text || answer.question_id}`)
            console.log(`   - A: ${answer.answer_text || JSON.stringify(answer.answer_value)}`)
          })
        }
      }
    }
    
    // 3. Test funkcji get_thread_survey_data
    console.log('\n3. Test funkcji get_thread_survey_data...')
    const { data: functionResult, error: funcError } = await supabase
      .rpc('get_thread_survey_data', { p_thread_id: threadId })
    
    if (funcError) {
      console.log('❌ Błąd funkcji:', funcError.message)
    } else {
      console.log('✅ Wynik funkcji:')
      console.log(JSON.stringify(functionResult, null, 2))
    }
    
  } catch (error) {
    console.error('❌ Błąd:', error.message)
  }
}

debugSurveyAnswers()
