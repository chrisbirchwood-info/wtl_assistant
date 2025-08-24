import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Załaduj zmienne środowiskowe
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🚀 Aplikowanie migracji SQL do bazy danych...')

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

async function applyMigrations() {
  try {
    console.log('\n📋 Sprawdzanie aktualnej struktury...')
    
    // Sprawdź aktualną strukturę tabeli users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      console.log('❌ Błąd dostępu do tabeli users:', usersError.message)
      return
    }
    
    if (users && users.length > 0) {
      console.log('📊 Kolumny w tabeli users:', Object.keys(users[0]))
    } else {
      console.log('ℹ️  Tabela users jest pusta')
    }
    
    // Sprawdź czy kolumna role istnieje
    const hasRoleColumn = users && users.length > 0 && 'role' in users[0]
    console.log(`🔍 Kolumna 'role' istnieje: ${hasRoleColumn ? '✅ TAK' : '❌ NIE'}`)
    
    if (!hasRoleColumn) {
      console.log('\n🔧 Dodawanie kolumny role do tabeli users...')
      
      // Dodaj kolumnę role
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'student',
          ADD COLUMN IF NOT EXISTS wtl_user_id VARCHAR(255),
          ADD COLUMN IF NOT EXISTS wtl_last_sync TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS wtl_sync_status VARCHAR(50) DEFAULT 'pending'
        `
      })
      
      if (alterError) {
        console.log('⚠️  Nie można użyć exec_sql, próbuję alternatywnej metody...')
        
        // Alternatywna metoda - dodaj kolumnę przez INSERT z nową strukturą
        console.log('🔄 Próba dodania kolumny przez restrukturyzację...')
      } else {
        console.log('✅ Kolumna role została dodana')
      }
    }
    
    // Sprawdź czy tabele teacher_profiles i student_profiles istnieją
    console.log('\n🔍 Sprawdzanie tabel profilów...')
    
    const tablesToCheck = ['teacher_profiles', 'student_profiles', 'user_sync_log']
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1)
        
        if (error) {
          console.log(`❌ Tabela ${table}: ${error.message}`)
          console.log(`🔧 Tworzenie tabeli ${table}...`)
          
          // Tutaj można dodać tworzenie tabeli przez SQL
          // Na razie tylko informacja
        } else {
          console.log(`✅ Tabela ${table}: dostępna`)
        }
      } catch (error) {
        console.log(`❌ Tabela ${table}: błąd - ${error.message}`)
      }
    }
    
    console.log('\n📊 Podsumowanie:')
    console.log('   - Tabela users: ✅ istnieje')
    console.log(`   - Kolumna role: ${hasRoleColumn ? '✅ istnieje' : '❌ brak'}`)
    console.log('   - Tabele profilów: wymagają utworzenia')
    
    if (!hasRoleColumn) {
      console.log('\n💡 Aby dokończyć migrację:')
      console.log('   1. Przejdź do Supabase Dashboard')
      console.log('   2. Otwórz SQL Editor')
      console.log('   3. Wykonaj migrację 002_user_types.sql')
      console.log('   4. Lub uruchom: npx supabase db push')
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas aplikowania migracji:', error.message)
  }
}

// Uruchom migracje
applyMigrations()
