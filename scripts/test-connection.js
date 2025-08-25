#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

console.log('🔗 Testowanie połączenia z Supabase...\n')

// Sprawdź zmienne środowiskowe
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Brak zmiennych środowiskowych Supabase!')
  console.error('\nDodaj do .env.local:')
  console.error('NEXT_PUBLIC_SUPABASE_URL=your_project_url')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key')
  process.exit(1)
}

console.log('✅ Zmienne środowiskowe znalezione:')
console.log(`   URL: ${supabaseUrl}`)
console.log(`   Key: ${supabaseAnonKey.substring(0, 20)}...`)

// Inicjalizuj klienta
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    console.log('\n🔄 Testowanie połączenia...')
    
    // Test 1: Pobierz informacje o tabelach
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5)
    
    if (tablesError) {
      console.log('⚠️  Nie można pobrać listy tabel (może baza jest pusta):', tablesError.message)
    } else {
      console.log('✅ Połączenie z bazą udane!')
      if (tables && tables.length > 0) {
        console.log('📊 Dostępne tabele:')
        tables.forEach(table => {
          console.log(`   - ${table.table_name}`)
        })
      } else {
        console.log('📭 Brak tabel w bazie (prawdopodobnie pusta)')
      }
    }
    
    // Test 2: Spróbuj utworzyć testową tabelę (jeśli nie istnieje)
    console.log('\n🔄 Testowanie tworzenia tabeli...')
    
    // Sprawdź czy tabela users istnieje
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersError && usersError.code === '42P01') {
      console.log('❌ Tabela `users` nie istnieje!')
      console.log('   Uruchom migrację SQL w Supabase Dashboard')
    } else if (usersError) {
      console.log('⚠️  Błąd podczas sprawdzania tabeli users:', usersError.message)
    } else {
      console.log('✅ Tabela `users` istnieje i jest dostępna')
      
      // Pobierz liczbę użytkowników
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
      
      console.log(`   Liczba użytkowników: ${count || 0}`)
    }
    
    // Test 3: Sprawdź tabele profilów (user_sessions została usunięta)
    console.log('\n🔄 Sprawdzanie tabel profilów...')
    
    try {
      const { data: teacherProfiles, error: teacherError } = await supabase
        .from('teacher_profiles')
        .select('count')
        .limit(1)
      
      if (teacherError) {
        console.log('⚠️  Tabela teacher_profiles:', teacherError.message)
      } else {
        console.log('✅ Tabela `teacher_profiles` istnieje i jest dostępna')
      }
      
      const { data: studentProfiles, error: studentError } = await supabase
        .from('student_profiles')
        .select('count')
        .limit(1)
      
      if (studentError) {
        console.log('⚠️  Tabela student_profiles:', studentError.message)
      } else {
        console.log('✅ Tabela `student_profiles` istnieje i jest dostępna')
      }
    } catch (error) {
      console.log('❌ Błąd podczas sprawdzania tabel profilów:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas testowania:', error.message)
  }
}

// Uruchom test
testConnection().then(() => {
  console.log('\n✅ Test zakończony!')
  console.log('\n💡 Następne kroki:')
  console.log('1. Uruchom migrację SQL w Supabase Dashboard')
  console.log('2. Użyj: npm run supabase (dla pełnego CLI)')
  console.log('3. Sprawdź czy tabele zostały utworzone')
  
  process.exit(0)
}).catch(error => {
  console.error('❌ Test nie powiódł się:', error)
  process.exit(1)
})
