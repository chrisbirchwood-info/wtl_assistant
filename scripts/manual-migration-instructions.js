#!/usr/bin/env node

/**
 * Wyświetla instrukcje do ręcznego zastosowania migracji
 */

const fs = require('fs')
const path = require('path')

console.log('📋 INSTRUKCJE RĘCZNEGO ZASTOSOWANIA MIGRACJI')
console.log('==========================================')
console.log('')
console.log('Migracja nie została zastosowana automatycznie.')
console.log('Wykonaj następujące kroki:')
console.log('')
console.log('1. Otwórz Supabase Dashboard:')
console.log('   https://supabase.com/dashboard/project/ntvsycffgjgaqtdymwsd')
console.log('')
console.log('2. Przejdź do SQL Editor')
console.log('')
console.log('3. Skopiuj i wklej poniższy kod SQL:')
console.log('')
console.log('=' .repeat(80))

// Wczytaj plik migracji
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250105020000_create_survey_thread_connections.sql')

if (fs.existsSync(migrationPath)) {
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  console.log(migrationSQL)
} else {
  console.log('❌ Plik migracji nie został znaleziony!')
}

console.log('=' .repeat(80))
console.log('')
console.log('4. Uruchom SQL klikając "RUN"')
console.log('')
console.log('5. Sprawdź czy tabela została utworzona:')
console.log('   SELECT * FROM thread_survey_connections LIMIT 1;')
console.log('')
console.log('6. Sprawdź czy funkcje zostały utworzone:')
console.log('   SELECT proname FROM pg_proc WHERE proname LIKE \'%survey%\';')
console.log('')
console.log('Po wykonaniu tych kroków funkcjonalność będzie działać!')
