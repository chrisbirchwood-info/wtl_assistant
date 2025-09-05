#!/usr/bin/env node

/**
 * Skrypt do sprawdzenia stanu tabel ankiet
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Konfiguracja środowiska
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Brak wymaganych zmiennych środowiskowych')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkSurveyTables() {
  try {
    console.log('🔍 Sprawdzam tabele ankiet...\n')
    
    // 1. Sprawdź survey_forms
    console.log('1. Tabela survey_forms:')
    try {
      const { data: forms, error: formsError } = await supabase
        .from('survey_forms')
        .select('form_id, teacher_id, title, total_responses')
        .limit(10)
      
      if (formsError) {
        console.log('❌ Błąd:', formsError.message)
      } else {
        console.log(`✅ Znaleziono ${forms?.length || 0} formularzy:`)
        forms?.forEach(form => {
          console.log(`   - ${form.form_id}: "${form.title}" (${form.total_responses} odpowiedzi)`)
        })
      }
    } catch (error) {
      console.log('❌ Tabela survey_forms nie istnieje lub jest niedostępna')
    }
    
    console.log()
    
    // 2. Sprawdź survey_responses (nowy)
    console.log('2. Tabela survey_responses (nowy system):')
    try {
      const { data: responses, error: responsesError } = await supabase
        .from('survey_responses')
        .select('form_id, respondent_email')
        .limit(5)
      
      if (responsesError) {
        console.log('❌ Błąd:', responsesError.message)
      } else {
        console.log(`✅ Znaleziono ${responses?.length || 0} odpowiedzi`)
        
        // Grupuj po form_id
        const byForm = {}
        responses?.forEach(resp => {
          if (!byForm[resp.form_id]) byForm[resp.form_id] = 0
          byForm[resp.form_id]++
        })
        
        Object.entries(byForm).forEach(([formId, count]) => {
          console.log(`   - Form ${formId}: ${count} odpowiedzi`)
        })
      }
    } catch (error) {
              console.log('❌ Tabela survey_responses nie istnieje lub jest niedostępna')
    }
    
    console.log()
    
    // 3. Sprawdź stare survey_responses
    console.log('3. Stara tabela survey_responses:')
    try {
      const { data: oldResponses, error: oldError } = await supabase
        .from('survey_responses')
        .select('form_id, teacher_id')
        .limit(5)
      
      if (oldError) {
        console.log('❌ Błąd:', oldError.message)
      } else {
        console.log(`✅ Znaleziono ${oldResponses?.length || 0} odpowiedzi w starej tabeli`)
        
        // Grupuj po form_id
        const byForm = {}
        oldResponses?.forEach(resp => {
          if (!byForm[resp.form_id]) byForm[resp.form_id] = 0
          byForm[resp.form_id]++
        })
        
        Object.entries(byForm).forEach(([formId, count]) => {
          console.log(`   - Form ${formId}: ${count} odpowiedzi`)
        })
      }
    } catch (error) {
      console.log('❌ Tabela survey_responses nie istnieje')
    }
    
    console.log()
    
    // 4. Sprawdź czy thread_survey_connections istnieje
    console.log('4. Tabela thread_survey_connections:')
    try {
      const { data: connections, error: connError } = await supabase
        .from('thread_survey_connections')
        .select('count')
        .limit(1)
      
      if (connError) {
        console.log('❌ Błąd:', connError.message)
      } else {
        console.log('✅ Tabela thread_survey_connections istnieje')
      }
    } catch (error) {
      console.log('❌ Tabela thread_survey_connections nie istnieje')
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania:', error)
  }
}

checkSurveyTables().catch(console.error)
