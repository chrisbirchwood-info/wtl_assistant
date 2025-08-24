# 🗄️ Supabase CLI - Instrukcje użytkowania

## ✅ Połączenie zostało skonfigurowane!

Twój projekt jest teraz połączony z Supabase CLI i gotowy do zarządzania migracjami.

## 🚀 Dostępne komendy

### Zarządzanie migracjami
```bash
# Lista wszystkich migracji
npm run db:list

# Utworzenie nowej migracji
npm run db:new nazwa_migracji

# Zastosowanie migracji na zdalnej bazie
npm run db:push

# Pobranie zmian z zdalnej bazy
npm run db:pull

# Reset lokalnej bazy (wymaga Docker)
npm run db:reset

# Naprawa historii migracji
npm run db:repair --status applied ID_MIGRACJI
```

### Zarządzanie lokalną instancją (wymaga Docker)
```bash
# Uruchomienie lokalnej instancji
npm run supabase:start

# Zatrzymanie lokalnej instancji
npm run supabase:stop

# Status lokalnej instancji
npm run supabase:status
```

### Komendy bezpośrednie
```bash
# Bezpośrednie użycie Supabase CLI
npx supabase [komenda]

# Przykłady:
npx supabase migration list
npx supabase db push
npx supabase db pull
```

## 🔧 Konfiguracja

### Pliki konfiguracyjne
- `supabase/config.toml` - konfiguracja lokalna
- `supabase/migrations/` - katalog z migracjami
- `.env.local` - zmienne środowiskowe

### Wymagane zmienne środowiskowe
```env
NEXT_PUBLIC_SUPABASE_URL=https://ntvsycffgjgaqtdymwsd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📊 Status migracji

Aktualnie zsynchronizowane migracje:
- ✅ `001_initial_schema.sql` - Podstawowa struktura bazy
- ✅ `002_user_types.sql` - Typy użytkowników i profile
- ✅ `20250824184103_test_connection.sql` - Test połączenia

## 🐳 Uwaga dotycząca Docker

Lokalne operacje (start/stop/status) wymagają uruchomionego Docker Desktop z odpowiednimi uprawnieniami administratora.

## 🔍 Rozwiązywanie problemów

### Błąd "migration history does not match"
```bash
npm run db:repair --status applied ID_MIGRACJI
```

### Błąd Docker
- Uruchom Docker Desktop jako administrator
- Sprawdź czy Docker service jest uruchomiony

### Błąd połączenia
- Sprawdź czy zmienne środowiskowe są poprawnie ustawione
- Zweryfikuj hasło do bazy danych w dashboardzie Supabase

## 📚 Przydatne linki

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)
- [Supabase Dashboard](https://supabase.com/dashboard/project/ntvsycffgjgaqtdymwsd)
- [Docker Desktop](https://docs.docker.com/desktop/)

## 🎯 Następne kroki

1. **Utwórz nową migrację**: `npm run db:new nazwa_migracji`
2. **Edytuj plik migracji** w `supabase/migrations/`
3. **Zastosuj migrację**: `npm run db:push`
4. **Sprawdź status**: `npm run db:list`

---

**Projekt ID**: `ntvsycffgjgaqtdymwsd`  
**Status**: ✅ Połączony i gotowy do użycia
