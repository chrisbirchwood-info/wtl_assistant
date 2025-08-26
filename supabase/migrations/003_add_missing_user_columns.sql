-- Dodaj brakujące kolumny do tabeli users
-- Migracja 003: Add missing user columns

-- Dodaj kolumnę role
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'student';

-- Dodaj kolumnę is_active
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Dodaj kolumnę password_hash
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Dodaj kolumnę wtl_user_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS wtl_user_id VARCHAR(255);

-- Dodaj kolumnę wtl_last_sync
ALTER TABLE users ADD COLUMN IF NOT EXISTS wtl_last_sync TIMESTAMP WITH TIME ZONE;

-- Dodaj kolumnę wtl_sync_status
ALTER TABLE users ADD COLUMN IF NOT EXISTS wtl_sync_status VARCHAR(50) DEFAULT 'pending';

-- Zaktualizuj istniejącego użytkownika admin@example.com
UPDATE users 
SET role = 'superadmin', 
    is_active = true, 
    password_hash = 'admin',
    updated_at = NOW()
WHERE email = 'admin@example.com';

-- Utwórz indeks na kolumnie role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Utwórz indeks na kolumnie is_active
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Utwórz indeks na kolumnie wtl_user_id
CREATE INDEX IF NOT EXISTS idx_users_wtl_user_id ON users(wtl_user_id);

