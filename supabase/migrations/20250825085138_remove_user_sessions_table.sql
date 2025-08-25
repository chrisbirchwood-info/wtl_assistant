-- Usunięcie nadmiarowej tabeli user_sessions
-- Tabela ta nie jest potrzebna w nowoczesnym systemie JWT + Zustand

-- 1. Usuń indeksy związane z tabelą user_sessions
DROP INDEX IF EXISTS idx_user_sessions_user_id;
DROP INDEX IF EXISTS idx_user_sessions_token;
DROP INDEX IF EXISTS idx_user_sessions_expires;

-- 2. Usuń tabelę user_sessions
DROP TABLE IF EXISTS user_sessions CASCADE;

-- 3. Dodaj komentarz wyjaśniający dlaczego usunęliśmy tę tabelę
COMMENT ON SCHEMA public IS 'Tabela user_sessions została usunięta - nadmiarowa w systemie JWT + Zustand';
