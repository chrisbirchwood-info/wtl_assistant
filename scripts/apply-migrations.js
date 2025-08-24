import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Załaduj zmienne środowiskowe
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔗 Connecting to Supabase...')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Migracja 002_user_types.sql
const migrationSQL = `
-- Dodanie typów użytkowników
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'teacher');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Aktualizacja tabeli users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'student';
ALTER TABLE users ADD COLUMN IF NOT EXISTS wtl_user_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wtl_last_sync TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wtl_sync_status VARCHAR(50) DEFAULT 'pending';

-- Tabela dla dodatkowych danych nauczycieli
CREATE TABLE IF NOT EXISTS teacher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialization TEXT,
  experience_years INTEGER,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela dla dodatkowych danych kursantów
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_course_id VARCHAR(255),
  progress_percentage DECIMAL(5,2) DEFAULT 0.00,
  enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela logów synchronizacji
CREATE TABLE IF NOT EXISTS user_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  wtl_user_id VARCHAR(255),
  sync_type VARCHAR(50),
  sync_status VARCHAR(50),
  user_role user_role,
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_wtl_id ON users(wtl_user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id ON teacher_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sync_log_user_id ON user_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sync_log_status ON user_sync_log(sync_status);

-- Funkcja dla updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggery dla updated_at
DROP TRIGGER IF EXISTS update_teacher_profiles_updated_at ON teacher_profiles;
CREATE TRIGGER update_teacher_profiles_updated_at 
  BEFORE UPDATE ON teacher_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON student_profiles;
CREATE TRIGGER update_student_profiles_updated_at 
  BEFORE UPDATE ON student_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`

async function applyMigration() {
  try {
    console.log('🔄 Applying migration 002_user_types...')
    
    // Użyj RPC do wykonania SQL (jeśli dostępne)
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.log('⚠️ RPC method not available, trying alternative approach...')
      
      // Alternatywne podejście - sprawdź czy tabele zostały utworzone
      await checkTablesAfterMigration()
      return
    }
    
    console.log('✅ Migration applied successfully')
    
  } catch (error) {
    console.log('⚠️ Migration method failed, checking if tables exist...')
    await checkTablesAfterMigration()
  }
}

async function checkTablesAfterMigration() {
  try {
    console.log('\n🔍 Checking tables after migration...')
    
    const requiredTables = ['users', 'teacher_profiles', 'student_profiles', 'user_sync_log']
    const existingTables = []
    const missingTables = []
    
    for (const table of requiredTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1)
        
        if (error) {
          missingTables.push(table)
        } else {
          existingTables.push(table)
        }
      } catch (error) {
        missingTables.push(table)
      }
    }
    
    console.log('✅ Existing tables:', existingTables)
    
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables)
      console.log('\n⚠️ Some tables are missing. You may need to run migrations manually.')
      console.log('📋 Go to Supabase Dashboard -> SQL Editor and run the migration manually.')
    } else {
      console.log('\n🎉 All required tables exist! Migration successful.')
    }
    
    // Sprawdź strukturę tabeli users
    const { data: userColumns, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (!userError && userColumns.length > 0) {
      const columns = Object.keys(userColumns[0])
      console.log('\n📋 Users table columns:', columns)
      
      const requiredColumns = ['role', 'wtl_user_id', 'wtl_last_sync', 'wtl_sync_status']
      const missingColumns = requiredColumns.filter(col => !columns.includes(col))
      
      if (missingColumns.length > 0) {
        console.log('❌ Missing columns in users table:', missingColumns)
      } else {
        console.log('✅ All required columns exist in users table')
      }
    }
    
  } catch (error) {
    console.error('❌ Table check failed:', error.message)
  }
}

async function main() {
  console.log('🚀 Applying Supabase Migrations\n')
  
  await applyMigration()
  
  console.log('\n✨ Migration process completed!')
}

main().catch(console.error)
