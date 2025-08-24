import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Załaduj zmienne środowiskowe
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔧 Prosta migracja - dodawanie kolumny role...')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Brak zmiennych środowiskowych Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function simpleMigration() {
  try {
    console.log('\n📋 Sprawdzanie aktualnego stanu...')
    
    // Sprawdź aktualną strukturę
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      console.log('❌ Błąd dostępu do tabeli users:', usersError.message)
      return false
    }
    
    console.log('📊 Aktualne kolumny:', Object.keys(users[0] || {}))
    
    // Jeśli tabela jest pusta, spróbuj dodać testowego użytkownika
    if (!users || users.length === 0) {
      console.log('\n🔧 Tabela jest pusta, próbuję dodać testowego użytkownika...')
      
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            email: 'test@example.com',
            username: 'testuser',
            role: 'student'
          }
        ])
        .select()
      
      if (insertError) {
        console.log('❌ Błąd podczas dodawania testowego użytkownika:', insertError.message)
        
        // Sprawdź czy problem jest z kolumną role
        if (insertError.message.includes('role')) {
          console.log('\n⚠️  Problem z kolumną role!')
          console.log('💡 Musisz wykonać migrację 002_user_types.sql w Supabase Dashboard')
          return false
        }
        
        return false
      } else {
        console.log('✅ Testowy użytkownik został dodany')
        console.log('📊 Nowe kolumny:', Object.keys(insertData[0]))
        return true
      }
    }
    
    // Sprawdź czy kolumna role istnieje
    const hasRoleColumn = 'role' in (users[0] || {})
    console.log(`🔍 Kolumna 'role' istnieje: ${hasRoleColumn ? '✅ TAK' : '❌ NIE'}`)
    
    if (!hasRoleColumn) {
      console.log('\n⚠️  Kolumna role nie istnieje!')
      console.log('💡 Musisz wykonać migrację 002_user_types.sql w Supabase Dashboard')
      return false
    }
    
    console.log('✅ Wszystko OK!')
    return true
    
  } catch (error) {
    console.error('❌ Błąd podczas migracji:', error.message)
    return false
  }
}

// Uruchom migrację
const success = await simpleMigration()

if (!success) {
  console.log('\n🔴 Migracja nie została wykonana!')
  console.log('💡 Wykonaj migrację ręcznie w Supabase Dashboard')
  process.exit(1)
} else {
  console.log('\n🟢 Migracja OK!')
}
