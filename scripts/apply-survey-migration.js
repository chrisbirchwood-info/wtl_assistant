import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import dotenv from 'dotenv'

// Załaduj zmienne środowiskowe
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🚀 Aplikowanie migracji systemu surveys...')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Brak zmiennych środowiskowych Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applySurveyMigration() {
  try {
    console.log('\n📋 Czytanie migracji...')
    
    const migrationPath = 'supabase/migrations/20250105010000_create_flexible_survey_system.sql'
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📊 Aplikowanie migracji do bazy danych...')
    
    // Podziel SQL na pojedyncze komendy
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
    
    let successCount = 0
    let errorCount = 0
    
    for (const command of commands) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: command })
        if (error) {
          console.log(`⚠️  Ostrzeżenie: ${error.message}`)
          if (error.message.includes('already exists')) {
            console.log('   (Tabela już istnieje - pomijam)')
            successCount++
          } else {
            errorCount++
          }
        } else {
          successCount++
        }
      } catch (err) {
        console.log(`❌ Błąd wykonania komendy: ${err.message}`)
        console.log(`   SQL: ${command.substring(0, 100)}...`)
        errorCount++
      }
    }
    
    console.log('\n📊 Podsumowanie migracji:')
    console.log(`   ✅ Pomyślnie wykonano: ${successCount} komend`)
    console.log(`   ❌ Błędy: ${errorCount} komend`)
    
    if (errorCount === 0) {
      console.log('\n🎉 Migracja systemu surveys została pomyślnie zastosowana!')
    } else {
      console.log('\n⚠️  Migracja została częściowo zastosowana z ostrzeżeniami')
    }
    
    // Sprawdź czy tabele zostały utworzone
    console.log('\n🔍 Sprawdzanie utworzonych tabel...')
    
    const tables = ['survey_forms', 'survey_responses_v2', 'survey_answers']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`❌ Tabela ${table}: ${error.message}`)
        } else {
          console.log(`✅ Tabela ${table}: utworzona pomyślnie`)
        }
      } catch (error) {
        console.log(`❌ Tabela ${table}: błąd - ${error.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas aplikowania migracji:', error.message)
    process.exit(1)
  }
}

// Uruchom migrację
applySurveyMigration()
