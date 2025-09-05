#!/usr/bin/env node

/**
 * Skrypt do aplikowania migracji za pomocą Supabase CLI
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Aplikowanie migracji dla połączeń ankiet z wątkami...')

try {
  // Sprawdź czy Supabase CLI jest zainstalowane
  try {
    execSync('supabase --version', { stdio: 'pipe' })
  } catch (error) {
    console.error('❌ Supabase CLI nie jest zainstalowane.')
    console.error('Zainstaluj: npm install -g supabase')
    process.exit(1)
  }

  // Sprawdź czy plik migracji istnieje
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250105020000_create_survey_thread_connections.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Plik migracji nie istnieje:', migrationPath)
    process.exit(1)
  }

  console.log('📄 Znaleziono plik migracji')

  // Uruchom migrację
  console.log('⚡ Uruchamiam migrację...')
  
  const result = execSync('supabase db push', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  })

  console.log('✅ Migracja została pomyślnie zastosowana!')
  console.log('\n🎉 Funkcjonalność połączeń ankiet z wątkami jest gotowa!')
  console.log('\nMożesz teraz:')
  console.log('1. Przejść do /teacher/[teacherId]/survey-threads')
  console.log('2. Linkować odpowiedzi z ankiet do wątków')
  console.log('3. Automatycznie tworzyć wątki z odpowiedzi')

} catch (error) {
  console.error('❌ Błąd podczas aplikowania migracji:', error.message)
  console.log('\n💡 Alternatywnie, możesz:')
  console.log('1. Skopiować zawartość pliku migracji')
  console.log('2. Wkleić w Supabase Dashboard → SQL Editor')
  console.log('3. Uruchomić ręcznie')
  console.log('\nPlik migracji: supabase/migrations/20250105020000_create_survey_thread_connections.sql')
  process.exit(1)
}
