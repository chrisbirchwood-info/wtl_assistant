#!/usr/bin/env node

/**
 * Skrypt do aplikowania migracji dla połączeń ankiet z wątkami
 * Uruchamia migrację 20250105020000_create_survey_thread_connections.sql
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Konfiguracja środowiska
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Brak wymaganych zmiennych środowiskowych:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function applyMigration() {
  try {
    console.log('🚀 Rozpoczynam aplikowanie migracji dla połączeń ankiet z wątkami...')
    
    // Wczytaj plik migracji
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250105020000_create_survey_thread_connections.sql')
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Plik migracji nie istnieje: ${migrationPath}`)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    console.log('📄 Wczytano plik migracji')
    
    // Sprawdź czy tabela już istnieje
    const { data: existingTable } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'thread_survey_connections')
      .single()
    
    if (existingTable) {
      console.log('⚠️  Tabela thread_survey_connections już istnieje. Pomijam migrację.')
      return
    }
    
    // Wykonaj migrację
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      throw error
    }
    
    console.log('✅ Migracja została pomyślnie zastosowana!')
    
    // Sprawdź czy tabela została utworzona
    const { data: newTable, error: checkError } = await supabase
      .from('thread_survey_connections')
      .select('count')
      .limit(1)
    
    if (checkError) {
      console.log('⚠️  Nie można sprawdzić tabeli, ale migracja została wykonana')
    } else {
      console.log('✅ Tabela thread_survey_connections została utworzona')
    }
    
    // Sprawdź czy funkcje zostały utworzone
    const { data: functions } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .in('routine_name', ['create_thread_from_survey_response', 'get_thread_survey_data'])
    
    console.log(`✅ Utworzono ${functions?.length || 0} funkcji pomocniczych`)
    
    console.log('\n🎉 Migracja zakończona pomyślnie!')
    console.log('\nTeraz możesz:')
    console.log('1. Linkować odpowiedzi z ankiet do wątków uczniów')
    console.log('2. Automatycznie tworzyć wątki na podstawie odpowiedzi z ankiet')
    console.log('3. Przeglądać połączenia w panelu nauczyciela: /teacher/[teacherId]/survey-threads')
    
  } catch (error) {
    console.error('❌ Błąd podczas aplikowania migracji:', error)
    process.exit(1)
  }
}

// Alternatywna metoda - bezpośrednie wykonanie SQL
async function applyMigrationDirect() {
  try {
    console.log('🚀 Rozpoczynam aplikowanie migracji (metoda bezpośrednia)...')
    
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250105020000_create_survey_thread_connections.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Podziel SQL na pojedyncze instrukcje
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    console.log(`📄 Znaleziono ${statements.length} instrukcji SQL`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.startsWith('--') || statement.length < 10) continue
      
      console.log(`⚡ Wykonuję instrukcję ${i + 1}/${statements.length}`)
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        console.error(`❌ Błąd w instrukcji ${i + 1}:`, error)
        throw error
      }
    }
    
    console.log('✅ Wszystkie instrukcje zostały wykonane!')
    
  } catch (error) {
    console.error('❌ Błąd podczas bezpośredniej migracji:', error)
    console.log('\n💡 Spróbuj uruchomić migrację ręcznie w Supabase Dashboard')
    process.exit(1)
  }
}

// Główna funkcja
async function main() {
  const method = process.argv[2] || 'direct'
  
  if (method === 'direct') {
    await applyMigrationDirect()
  } else {
    await applyMigration()
  }
}

main().catch(console.error)
