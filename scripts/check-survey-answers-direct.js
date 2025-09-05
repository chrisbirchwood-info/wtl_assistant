#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkSurveyAnswers() {
  try {
    console.log('🔍 Sprawdzam survey_answers bezpośrednio...\n')
    
    // Sprawdź wszystkie odpowiedzi
    const { data: answers, error } = await supabase
      .from('survey_answers')
      .select('*')
    
    if (error) {
      console.log('❌ Błąd:', error.message)
      return
    }
    
    console.log(`✅ Znaleziono ${answers?.length || 0} szczegółowych odpowiedzi:`)
    answers?.forEach(answer => {
      console.log(`   - Q: ${answer.question_text || answer.question_id}`)
      console.log(`   - A: ${answer.answer_text || JSON.stringify(answer.answer_value)}`)
      console.log(`   - Response ID: ${answer.response_id}`)
      console.log('   ---')
    })
    
    if (!answers || answers.length === 0) {
      console.log('❌ Tabela survey_answers jest pusta!')
      console.log('Problem: Synchronizacja nie zapisuje szczegółowych odpowiedzi')
    }
    
  } catch (error) {
    console.error('❌ Błąd:', error.message)
  }
}

checkSurveyAnswers()
