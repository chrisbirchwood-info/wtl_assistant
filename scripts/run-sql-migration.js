import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Załaduj zmienne środowiskowe
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🚀 Uruchamianie migracji SQL...')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Brak zmiennych środowiskowych Supabase (potrzebny SERVICE_ROLE_KEY)')
  process.exit(1)
}

// Użyj service role key dla uprawnień administracyjnych
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runSQLMigration() {
  try {
    console.log('\n📋 Sprawdzanie dostępnych migracji...')
    
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
    
    console.log('📁 Znalezione pliki migracji:')
    migrationFiles.forEach(file => console.log(`   - ${file}`))
    
    // Sprawdź aktualny stan bazy
    console.log('\n🔍 Sprawdzanie aktualnego stanu bazy...')
    
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
    
    if (hasRoleColumn) {
      console.log('✅ Migracje zostały już zastosowane!')
      return true
    }
    
    // Uruchom migrację 002_user_types.sql
    console.log('\n🔧 Uruchamianie migracji 002_user_types.sql...')
    
    const migrationPath = path.join(migrationsDir, '002_user_types.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📝 SQL do wykonania:')
    console.log('   ', migrationSQL.split('\n')[0] + '...')
    
    // Próba wykonania SQL przez RPC (jeśli dostępne)
    const { error: rpcError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })
    
    if (rpcError) {
      console.log('⚠️  RPC method nie dostępne, próbuję alternatywnej metody...')
      
      // Alternatywna metoda - wykonaj SQL przez HTTP API
      console.log('🔄 Próba wykonania przez HTTP API...')
      
      // Tutaj możesz dodać kod do wykonania SQL przez HTTP
      // Na razie tylko informacja
      console.log('💡 Wykonaj migrację ręcznie w Supabase Dashboard')
      
    } else {
      console.log('✅ Migracja została wykonana pomyślnie!')
    }
    
    // Sprawdź wynik
    console.log('\n🔍 Weryfikacja migracji...')
    
    const { data: usersAfter, error: usersAfterError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersAfterError) {
      console.log('❌ Błąd podczas weryfikacji:', usersAfterError.message)
      return false
    }
    
    const hasRoleColumnAfter = usersAfter && usersAfter.length > 0 && 'role' in usersAfter[0]
    console.log(`🔍 Kolumna 'role' po migracji: ${hasRoleColumnAfter ? '✅ TAK' : '❌ NIE'}`)
    
    if (hasRoleColumnAfter) {
      console.log('🎉 Migracja zakończona sukcesem!')
      return true
    } else {
      console.log('❌ Migracja nie została zastosowana')
      return false
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas uruchamiania migracji:', error.message)
    return false
  }
}

// Uruchom migrację
const success = await runSQLMigration()

if (!success) {
  console.log('\n🔴 Migracja nie została wykonana!')
  console.log('💡 Wykonaj migrację ręcznie w Supabase Dashboard')
  process.exit(1)
} else {
  console.log('\n🟢 Migracja OK!')
}
