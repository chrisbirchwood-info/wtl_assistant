#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Synchronizacja danych z produkcji na lokalną bazę...');

// Sprawdź czy jesteśmy w lokalnym środowisku
const envFile = '.env.local.active';
if (!fs.existsSync(envFile)) {
  console.error('❌ Brak aktywnego pliku środowiskowego!');
  console.log('💡 Uruchom: npm run env:local');
  process.exit(1);
}

const envContent = fs.readFileSync(envFile, 'utf8');
if (!envContent.includes('127.0.0.1:54321')) {
  console.error('❌ Nie jesteś w lokalnym środowisku!');
  console.log('💡 Uruchom: npm run env:local');
  process.exit(1);
}

console.log('✅ Środowisko lokalne aktywne');

// Instrukcje synchronizacji
console.log('\n📋 Kroki synchronizacji:');
console.log('1. Zastosuj migrację 006_sync_production_data.sql');
console.log('2. Sprawdź czy dane są identyczne');
console.log('3. Przetestuj aplikację lokalnie');

console.log('\n🚀 Komendy do wykonania:');
console.log('');

// Sprawdź czy migracja istnieje
const migrationFile = 'supabase/migrations/006_sync_production_data.sql';
if (fs.existsSync(migrationFile)) {
  console.log('✅ Migracja 006_sync_production_data.sql istnieje');
  console.log('');
  console.log('📥 Zastosuj migrację:');
  console.log('   npx supabase db reset');
  console.log('');
  console.log('🔍 Sprawdź dane:');
  console.log('   npx supabase db diff --schema public');
  console.log('');
  console.log('🌐 Uruchom aplikację:');
  console.log('   npm run dev:local');
} else {
  console.error('❌ Migracja 006_sync_production_data.sql nie istnieje!');
  process.exit(1);
}

console.log('\n📊 Po synchronizacji będziesz mieć:');
console.log('   👥 7 użytkowników (1 admin, 3 nauczycieli, 3 studentów)');
console.log('   📚 5 kursów z opisami');
console.log('   👨‍🏫 5 przypisań nauczycieli do kursów');
console.log('   🎓 3 studentów z zapisami na kursy');
console.log('');
console.log('🎯 Dane będą identyczne w lokalnej i produkcyjnej bazie!');
