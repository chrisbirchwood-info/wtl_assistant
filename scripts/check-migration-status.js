#!/usr/bin/env node

/**
 * Skrypt do sprawdzenia czy migracja została rzeczywiście zastosowana
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

async function checkMigrationStatus() {
  try {
    console.log('🔍 Sprawdzam status migracji...')
    
    // Sprawdź czy tabela thread_survey_connections istnieje
    console.log('\n1. Sprawdzam czy tabela thread_survey_connections istnieje...')
    const { data: tableExists, error: tableError } = await supabase
      .from('thread_survey_connections')
      .select('count')
      .limit(1)
    
    if (tableError) {
      if (tableError.code === '42P01') {
        console.log('❌ Tabela thread_survey_connections NIE ISTNIEJE')
        console.log('   Migracja nie została zastosowana mimo statusu "applied"')
      } else {
        console.log('❌ Błąd podczas sprawdzania tabeli:', tableError.message)
      }
    } else {
      console.log('✅ Tabela thread_survey_connections istnieje')
    }
    
    // Sprawdź czy funkcje istnieją
    console.log('\n2. Sprawdzam czy funkcje pomocnicze istnieją...')
    const { data: functions, error: funcError } = await supabase
      .from('pg_proc')
      .select('proname')
      .in('proname', ['create_thread_from_survey_response', 'get_thread_survey_data'])
    
    if (funcError) {
      console.log('❌ Błąd podczas sprawdzania funkcji:', funcError.message)
    } else {
      console.log(`✅ Znaleziono ${functions?.length || 0} funkcji pomocniczych`)
      if (functions && functions.length > 0) {
        functions.forEach(func => console.log(`   - ${func.proname}`))
      }
    }
    
    // Sprawdź czy tabele surveys istnieją
    console.log('\n3. Sprawdzam czy tabele ankiet istnieją...')
    const { data: surveyTables, error: surveyError } = await supabase
      .from('survey_responses_v2')
      .select('count')
      .limit(1)
    
    if (surveyError) {
      console.log('❌ Tabela survey_responses_v2 nie istnieje:', surveyError.message)
    } else {
      console.log('✅ Tabela survey_responses_v2 istnieje')
    }
    
    // Sprawdź czy tabela threads istnieje
    console.log('\n4. Sprawdzam czy tabela threads istnieje...')
    const { data: threadsTable, error: threadsError } = await supabase
      .from('threads')
      .select('count')
      .limit(1)
    
    if (threadsError) {
      console.log('❌ Tabela threads nie istnieje:', threadsError.message)
    } else {
      console.log('✅ Tabela threads istnieje')
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania:', error)
  }
}

checkMigrationStatus().catch(console.error)
