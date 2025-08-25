-- Dodanie komentarza wyjaśniającego dlaczego usunęliśmy tabelę user_sessions
-- Tabela ta była nadmiarowa w nowoczesnym systemie JWT + Zustand

-- Dodaj komentarz do schematu public
COMMENT ON SCHEMA public IS 'Tabela user_sessions została usunięta - nadmiarowa w systemie JWT + Zustand. Sesje są zarządzane przez JWT tokens w localStorage.';

-- Dodaj komentarz do tabeli users
COMMENT ON TABLE users IS 'Główna tabela użytkowników. Sesje są zarządzane przez JWT + Zustand, nie przez bazę danych.';
