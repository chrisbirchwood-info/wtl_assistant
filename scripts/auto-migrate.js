import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Załaduj zmienne środowiskowe
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🚀 Automatyczne uruchamianie migracji...')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Brak zmiennych środowiskowych Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function autoMigrate() {
  try {
    console.log('\n📋 Sprawdzanie aktualnej struktury bazy...')
    
    // Sprawdź czy kolumna role istnieje
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      console.log('❌ Błąd dostępu do tabeli users:', usersError.message)
      return false
    }
    
    const hasRoleColumn = users && users.length > 0 && 'role' in users[0]
    console.log(`🔍 Kolumna 'role' istnieje: ${hasRoleColumn ? '✅ TAK' : '❌ NIE'}`)
    
    if (!hasRoleColumn) {
      console.log('\n⚠️  WYKRYTO BRAKUJĄCE MIGRACJE!')
      console.log('💡 Aby rozwiązać problem:')
      console.log('   1. Przejdź do Supabase Dashboard')
      console.log('   2. Otwórz SQL Editor')
      console.log('   3. Wykonaj migrację 002_user_types.sql')
      console.log('   4. Lub uruchom: npm run db:push')
      
      return false
    }
    
    // Sprawdź inne tabele
    console.log('\n🔍 Sprawdzanie tabel profilów...')
    
    const tablesToCheck = ['teacher_profiles', 'student_profiles', 'user_sync_log']
    let missingTables = []
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1)
        
        if (error) {
          missingTables.push(table)
        }
      } catch (error) {
        missingTables.push(table)
      }
    }
    
    if (missingTables.length > 0) {
      console.log(`⚠️  Brakujące tabele: ${missingTables.join(', ')}`)
      console.log('💡 Wykonaj migrację 002_user_types.sql w Supabase Dashboard')
      return false
    }
    
    console.log('✅ Wszystkie migracje zostały zastosowane!')
    return true
    
  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania migracji:', error.message)
    return false
  }
}

// Uruchom automatyczną migrację
const success = await autoMigrate()

if (!success) {
  console.log('\n🔴 Migracje nie zostały zastosowane!')
  console.log('📋 Sprawdź logi powyżej i rozwiąż problemy przed kontynuowaniem.')
  process.exit(1)
} else {
  console.log('\n🟢 Migracje OK - możesz kontynuować build!')
}
