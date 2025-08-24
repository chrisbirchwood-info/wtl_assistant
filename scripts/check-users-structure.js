import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Załaduj zmienne środowiskowe
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Sprawdzanie struktury tabeli users i ról użytkowników...')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Brak zmiennych środowiskowych Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkUsersStructure() {
  try {
    console.log('\n📊 Sprawdzanie struktury tabeli users...')
    
    // Sprawdź czy tabela istnieje i pobierz strukturę
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5)
    
    if (usersError) {
      console.log('❌ Błąd dostępu do tabeli users:', usersError.message)
      return
    }
    
    if (users && users.length > 0) {
      console.log('✅ Tabela users istnieje i ma dane')
      console.log('📋 Kolumny w tabeli users:')
      console.log('   ', Object.keys(users[0]))
      
      console.log('\n👥 Użytkownicy w bazie:')
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id}`)
        console.log(`      Email: ${user.email}`)
        console.log(`      Rola: ${user.role || 'BRAK ROLI!'}`)
        console.log(`      Username: ${user.username || 'brak'}`)
        console.log(`      WTL User ID: ${user.wtl_user_id || 'brak'}`)
        console.log(`      Ostatnia synchronizacja: ${user.wtl_last_sync || 'brak'}`)
        console.log(`      Status synchronizacji: ${user.wtl_sync_status || 'brak'}`)
        console.log('')
      })
      
      // Sprawdź czy wszyscy użytkownicy mają role
      const usersWithoutRole = users.filter(user => !user.role)
      if (usersWithoutRole.length > 0) {
        console.log('⚠️  UŻYTKOWNICY BEZ ROLI:')
        usersWithoutRole.forEach(user => {
          console.log(`   - ${user.email} (ID: ${user.id})`)
        })
      } else {
        console.log('✅ Wszyscy użytkownicy mają przypisane role')
      }
      
    } else {
      console.log('ℹ️  Tabela users istnieje ale jest pusta')
      
      // Spróbuj pobrać informacje o strukturze tabeli
      console.log('\n🔍 Próba pobrania informacji o strukturze tabeli...')
      
      // Sprawdź czy możemy pobrać informacje o schemacie
      try {
        const { data: schemaInfo, error: schemaError } = await supabase
          .from('users')
          .select('id, email, username, created_at, updated_at')
          .limit(1)
        
        if (schemaError) {
          console.log('❌ Błąd schematu:', schemaError.message)
        } else {
          console.log('✅ Można pobrać podstawowe kolumny')
          console.log('📋 Dostępne kolumny:', Object.keys(schemaInfo[0] || {}))
        }
      } catch (error) {
        console.log('❌ Błąd podczas sprawdzania schematu:', error.message)
      }
    }
    
    // Sprawdź inne tabele
    console.log('\n🔍 Sprawdzanie innych tabel...')
    
    const tablesToCheck = ['teacher_profiles', 'student_profiles', 'user_sync_log']
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1)
        
        if (error) {
          console.log(`❌ Tabela ${table}: ${error.message}`)
        } else {
          console.log(`✅ Tabela ${table}: dostępna`)
        }
      } catch (error) {
        console.log(`❌ Tabela ${table}: błąd - ${error.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania struktury:', error.message)
  }
}

// Uruchom sprawdzenie
checkUsersStructure()
