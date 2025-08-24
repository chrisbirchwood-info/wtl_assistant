#!/usr/bin/env node

const readline = require('readline')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Sprawdź zmienne środowiskowe
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Brak zmiennych środowiskowych Supabase!')
  console.error('Dodaj do .env.local:')
  console.error('NEXT_PUBLIC_SUPABASE_URL=your_project_url')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key')
  process.exit(1)
}

// Inicjalizuj klienta Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Interfejs readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Funkcje pomocnicze
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

function printMenu() {
  console.log('\n🗄️  Supabase CLI - Wybierz opcję:')
  console.log('1. 📊 Pokaż statystyki bazy')
  console.log('2. 👥 Lista użytkowników')
  console.log('3. 🔑 Lista sesji')
  console.log('4. ➕ Dodaj użytkownika')
  console.log('5. 🗑️  Usuń użytkownika')
  console.log('6. 🔍 Wyszukaj użytkownika')
  console.log('7. 🧹 Wyczyść stare sesje')
  console.log('8. 📋 Pokaż strukturę tabel')
  console.log('9. 🚪 Wyjście')
}

// Funkcje operacji na bazie
async function showStats() {
  console.log('\n📊 Statystyki bazy danych...')
  
  try {
    // Liczba użytkowników
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    // Liczba sesji
    const { count: sessionCount } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
    
    // Aktywne sesje (nie wygasłe)
    const { count: activeSessionCount } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .gt('expires_at', new Date().toISOString())
    
    console.log(`👥 Użytkownicy: ${userCount || 0}`)
    console.log(`🔑 Wszystkie sesje: ${sessionCount || 0}`)
    console.log(`✅ Aktywne sesje: ${activeSessionCount || 0}`)
    
  } catch (error) {
    console.error('❌ Błąd podczas pobierania statystyk:', error.message)
  }
}

async function listUsers() {
  console.log('\n👥 Lista użytkowników...')
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    if (!users || users.length === 0) {
      console.log('📭 Brak użytkowników w bazie')
      return
    }
    
    console.log(`\nZnaleziono ${users.length} użytkowników:\n`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username || 'Brak nazwy'} (${user.email})`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Utworzony: ${new Date(user.created_at).toLocaleString('pl-PL')}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Błąd podczas pobierania użytkowników:', error.message)
  }
}

async function listSessions() {
  console.log('\n🔑 Lista sesji...')
  
  try {
    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select(`
        *,
        users(email, username)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    if (!sessions || sessions.length === 0) {
      console.log('📭 Brak sesji w bazie')
      return
    }
    
    console.log(`\nZnaleziono ${sessions.length} sesji:\n`)
    sessions.forEach((session, index) => {
      const user = session.users
      const isExpired = new Date(session.expires_at) < new Date()
      const status = isExpired ? '❌ Wygasła' : '✅ Aktywna'
      
      console.log(`${index + 1}. ${status} - ${user?.email || 'Nieznany użytkownik'}`)
      console.log(`   Token: ${session.session_token.substring(0, 20)}...`)
      console.log(`   Wygasa: ${new Date(session.expires_at).toLocaleString('pl-PL')}`)
      console.log(`   Utworzona: ${new Date(session.created_at).toLocaleString('pl-PL')}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Błąd podczas pobierania sesji:', error.message)
  }
}

async function addUser() {
  console.log('\n➕ Dodawanie nowego użytkownika...')
  
  try {
    const email = await question('📧 Email: ')
    const username = await question('👤 Nazwa użytkownika (opcjonalnie): ')
    
    if (!email) {
      console.log('❌ Email jest wymagany!')
      return
    }
    
    const userData = {
      email: email.trim().toLowerCase(),
      username: username.trim() || null
    }
    
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single()
    
    if (error) throw error
    
    console.log('✅ Użytkownik został dodany!')
    console.log(`   ID: ${data.id}`)
    console.log(`   Email: ${data.email}`)
    console.log(`   Nazwa: ${data.username || 'Brak'}`)
    
  } catch (error) {
    console.error('❌ Błąd podczas dodawania użytkownika:', error.message)
  }
}

async function deleteUser() {
  console.log('\n🗑️  Usuwanie użytkownika...')
  
  try {
    const email = await question('📧 Email użytkownika do usunięcia: ')
    
    if (!email) {
      console.log('❌ Email jest wymagany!')
      return
    }
    
    // Potwierdzenie
    const confirm = await question(`⚠️  Czy na pewno chcesz usunąć użytkownika ${email}? (tak/nie): `)
    
    if (confirm.toLowerCase() !== 'tak') {
      console.log('❌ Operacja anulowana')
      return
    }
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('email', email.trim().toLowerCase())
    
    if (error) throw error
    
    console.log('✅ Użytkownik został usunięty!')
    
  } catch (error) {
    console.error('❌ Błąd podczas usuwania użytkownika:', error.message)
  }
}

async function searchUser() {
  console.log('\n🔍 Wyszukiwanie użytkownika...')
  
  try {
    const searchTerm = await question('🔍 Wprowadź email lub nazwę użytkownika: ')
    
    if (!searchTerm) {
      console.log('❌ Termin wyszukiwania jest wymagany!')
      return
    }
    
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
    
    if (error) throw error
    
    if (!users || users.length === 0) {
      console.log('📭 Nie znaleziono użytkowników')
      return
    }
    
    console.log(`\nZnaleziono ${users.length} użytkowników:\n`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username || 'Brak nazwy'} (${user.email})`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Utworzony: ${new Date(user.created_at).toLocaleString('pl-PL')}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Błąd podczas wyszukiwania:', error.message)
  }
}

async function cleanupSessions() {
  console.log('\n🧹 Czyszczenie starych sesji...')
  
  try {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
    
    if (error) throw error
    
    console.log('✅ Stare sesje zostały usunięte!')
    
  } catch (error) {
    console.error('❌ Błąd podczas czyszczenia sesji:', error.message)
  }
}

async function showTableStructure() {
  console.log('\n📋 Struktura tabel...')
  
  try {
    // Pobierz informacje o tabelach
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (error) throw error
    
    console.log('\nDostępne tabele:')
    tables.forEach(table => {
      console.log(`   📊 ${table.table_name}`)
    })
    
    // Szczegóły tabeli users
    console.log('\n📊 Tabela `users`:')
    console.log('   - id (UUID, PRIMARY KEY)')
    console.log('   - email (VARCHAR(255), UNIQUE)')
    console.log('   - username (VARCHAR(255))')
    console.log('   - created_at (TIMESTAMP)')
    console.log('   - updated_at (TIMESTAMP)')
    
    // Szczegóły tabeli user_sessions
    console.log('\n🔑 Tabela `user_sessions`:')
    console.log('   - id (UUID, PRIMARY KEY)')
    console.log('   - user_id (UUID, FOREIGN KEY)')
    console.log('   - session_token (TEXT)')
    console.log('   - expires_at (TIMESTAMP)')
    console.log('   - created_at (TIMESTAMP)')
    
  } catch (error) {
    console.error('❌ Błąd podczas pobierania struktury:', error.message)
  }
}

// Główna pętla
async function main() {
  console.log('🚀 Supabase CLI - Narzędzie do zarządzania bazą danych')
  console.log(`🔗 Połączono z: ${supabaseUrl}`)
  
  while (true) {
    printMenu()
    
    try {
      const choice = await question('\n🎯 Wybierz opcję (1-9): ')
      
      switch (choice) {
        case '1':
          await showStats()
          break
        case '2':
          await listUsers()
          break
        case '3':
          await listSessions()
          break
        case '4':
          await addUser()
          break
        case '5':
          await deleteUser()
          break
        case '6':
          await searchUser()
          break
        case '7':
          await cleanupSessions()
          break
        case '8':
          await showTableStructure()
          break
        case '9':
          console.log('👋 Do widzenia!')
          rl.close()
          process.exit(0)
        default:
          console.log('❌ Nieprawidłowa opcja!')
      }
      
      await question('\n⏸️  Naciśnij Enter, aby kontynuować...')
      
    } catch (error) {
      console.error('❌ Wystąpił błąd:', error.message)
    }
  }
}

// Obsługa błędów
process.on('unhandledRejection', (error) => {
  console.error('❌ Nieobsłużony błąd:', error)
  process.exit(1)
})

// Uruchom CLI
main().catch(console.error)
