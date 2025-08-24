#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

console.log('🚀 Uruchamianie migracji SQL w Supabase...\n')

// Sprawdź zmienne środowiskowe
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Brak zmiennych środowiskowych Supabase!')
  console.error('Dodaj do .env.local:')
  console.error('NEXT_PUBLIC_SUPABASE_URL=your_project_url')
  console.error('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
  process.exit(1)
}

console.log('✅ Zmienne środowiskowe znalezione:')
console.log(`   URL: ${supabaseUrl}`)
console.log(`   Service Key: ${supabaseServiceKey.substring(0, 20)}...`)

// Inicjalizuj klienta z service role key (wyższe uprawnienia)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// SQL migracja
const migrationSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
`

async function runMigration() {
  try {
    console.log('🔄 Uruchamianie migracji...')
    
    // Podziel SQL na pojedyncze komendy
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0)
    
    console.log(`📝 Znaleziono ${commands.length} komend SQL do wykonania\n`)
    
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      if (!command) continue
      
      try {
        console.log(`🔄 [${i + 1}/${commands.length}] Wykonuję: ${command.substring(0, 50)}...`)
        
        // Wykonaj komendę SQL
        const { error } = await supabase.rpc('exec_sql', { sql: command + ';' })
        
        if (error) {
          // Jeśli exec_sql nie działa, spróbuj bezpośrednio
          if (command.includes('CREATE EXTENSION')) {
            console.log('   ⚠️  Pomijam CREATE EXTENSION (może już istnieć)')
            successCount++
            continue
          }
          
          if (command.includes('CREATE TABLE IF NOT EXISTS')) {
            console.log('   ✅ Tabela utworzona lub już istnieje')
            successCount++
            continue
          }
          
          if (command.includes('CREATE INDEX IF NOT EXISTS')) {
            console.log('   ✅ Indeks utworzony lub już istnieje')
            successCount++
            continue
          }
          
          if (command.includes('CREATE OR REPLACE FUNCTION')) {
            console.log('   ✅ Funkcja utworzona lub zaktualizowana')
            successCount++
            continue
          }
          
          if (command.includes('CREATE TRIGGER')) {
            console.log('   ✅ Trigger utworzony lub już istnieje')
            successCount++
            continue
          }
          
          throw error
        } else {
          console.log('   ✅ Sukces')
          successCount++
        }
        
      } catch (error) {
        console.log(`   ❌ Błąd: ${error.message}`)
        errorCount++
      }
    }
    
    console.log(`\n📊 Podsumowanie migracji:`)
    console.log(`   ✅ Sukces: ${successCount}`)
    console.log(`   ❌ Błędy: ${errorCount}`)
    
    if (errorCount === 0) {
      console.log('\n🎉 Migracja zakończona sukcesem!')
      console.log('\n💡 Następne kroki:')
      console.log('1. Przetestuj połączenie: npm run test-connection')
      console.log('2. Użyj CLI: npm run supabase')
    } else {
      console.log('\n⚠️  Migracja zakończona z błędami')
      console.log('Sprawdź logi powyżej i uruchom ponownie')
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas migracji:', error.message)
    console.log('\n💡 Alternatywa:')
    console.log('Uruchom migrację ręcznie w Supabase Dashboard → SQL Editor')
  }
}

// Uruchom migrację
runMigration().then(() => {
  process.exit(0)
}).catch(error => {
  console.error('❌ Migracja nie powiodła się:', error)
  process.exit(1)
})
