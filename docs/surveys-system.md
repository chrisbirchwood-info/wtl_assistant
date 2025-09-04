# System Ankiet (Surveys)

System ankiet umożliwia nauczycielom integrację z Google Forms i synchronizację odpowiedzi uczniów.

## Struktura Bazy Danych

### Tabela `google_oauth_tokens`
```sql
create table public.google_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null default 'google',
  refresh_token text not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
```

### Tabela `survey_responses`
```sql
create table public.survey_responses (
  response_id text primary key,
  teacher_id uuid not null,
  form_id text not null,
  submitted_at timestamptz,
  payload jsonb not null,
  updated_at timestamptz
);
```

## Polityki RLS

System używa Row Level Security (RLS) do zabezpieczenia danych:

- **google_oauth_tokens**: Użytkownicy mogą zarządzać tylko swoimi tokenami
- **survey_responses**: Nauczyciele mogą zarządzać tylko swoimi odpowiedziami
- **Superadmini**: Mają dostęp do wszystkich danych

## API Endpoints

### `/api/surveys/google/authorize`
- **Metoda**: GET
- **Opis**: Przekierowuje do Google OAuth dla autoryzacji
- **Parametry**: `teacherId`, `returnTo`

### `/api/surveys/google/callback`
- **Metoda**: GET  
- **Opis**: Obsługuje callback z Google OAuth
- **Funkcja**: Zapisuje refresh_token w bazie danych

### `/api/surveys/google/sync`
- **Metoda**: POST
- **Opis**: Synchronizuje odpowiedzi z Google Forms
- **Body**: `{ teacherId: string, formId?: string, link?: string }`

## Interfejs Użytkownika

### Strona Nauczyciela: `/teacher/[teacherId]/surveys`

Funkcjonalności:
- ✅ Dodawanie linków do ankiet
- ✅ Połączenie z Google OAuth
- ✅ Synchronizacja odpowiedzi
- ✅ Zarządzanie listą ankiet
- ✅ Migracja ze starego formatu localStorage

## Konfiguracja Google OAuth

Wymagane zmienne środowiskowe w `.env.local`:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/surveys/google/callback
```

### Konfiguracja Google Cloud Console

1. Utwórz projekt w Google Cloud Console
2. Włącz Google Forms API
3. Utwórz OAuth 2.0 credentials
4. Dodaj authorized redirect URIs:
   - `http://localhost:3000/api/surveys/google/callback` (development)
   - `https://yourdomain.com/api/surveys/google/callback` (production)

## Migracje

### Zastosowane migracje:
- ✅ `20250904090000_surveys_google.sql` - Podstawowe tabele
- ✅ `20250105000000_add_surveys_rls_policies.sql` - Polityki RLS

### Zastosowanie migracji:
```bash
# Zastosuj wszystkie migracje
npm run db:push

# Lub ręcznie przez Supabase Dashboard
```

## Testowanie

Uruchom test integracji:
```bash
node scripts/test-surveys-integration.js
```

Test sprawdza:
- ✅ Istnienie tabel w bazie danych
- ✅ Polityki RLS
- ✅ Konfigurację Google OAuth
- ✅ Połączenie z bazą danych

## Bezpieczeństwo

- **RLS**: Wszystkie tabele mają włączone Row Level Security
- **Service Role**: API używa service role key dla operacji na bazie
- **OAuth Tokens**: Refresh tokeny są szyfrowane i dostępne tylko dla właściciela
- **HTTPS**: Wymagane dla produkcji (Google OAuth wymaga HTTPS)

## Rozwiązywanie Problemów

### Błąd: "Google not connected for this teacher"
- Sprawdź czy nauczyciel przeszedł proces OAuth
- Sprawdź czy refresh_token istnieje w tabeli `google_oauth_tokens`

### Błąd: "Missing Supabase env"
- Sprawdź zmienne środowiskowe `NEXT_PUBLIC_SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY`

### Błąd: "Token exchange failed"
- Sprawdź konfigurację Google OAuth
- Sprawdź czy redirect URI jest poprawny
- Sprawdź czy Google Forms API jest włączone

## Przyszłe Rozszerzenia

- [ ] Analityka odpowiedzi
- [ ] Eksport danych do CSV/Excel
- [ ] Automatyczna synchronizacja (webhook)
- [ ] Powiadomienia o nowych odpowiedziach
- [ ] Integracja z systemem oceniania
