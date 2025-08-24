# 🚀 Wdrożenie systemu synchronizacji użytkowników WTL

## 📋 Wymagania wstępne

- Node.js 18+
- Docker Desktop (dla Supabase lokalnego)
- Dostęp do API WebToLearn
- Zmienne środowiskowe skonfigurowane

## 🔧 Konfiguracja

### 1. Zmienne środowiskowe

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
WTL_API_URL=https://your-platform.elms.pl/api/v1
WTL_API_KEY=your_wtl_api_key
```

### 2. Uruchomienie Supabase lokalnie

```bash
# Uruchom Docker Desktop
# Następnie w katalogu głównym:
npx supabase start

# Zastosuj migracje:
npx supabase db push
```

## 🗄️ Struktura bazy danych

### Tabela `users` (rozszerzona)
```sql
- id: UUID (PK)
- email: VARCHAR(255) UNIQUE
- username: VARCHAR(255)
- role: ENUM('student', 'teacher') DEFAULT 'student'
- wtl_user_id: VARCHAR(255)
- wtl_last_sync: TIMESTAMP
- wtl_sync_status: VARCHAR(50) DEFAULT 'pending'
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Tabela `teacher_profiles`
```sql
- id: UUID (PK)
- user_id: UUID (FK -> users.id)
- specialization: TEXT
- experience_years: INTEGER
- bio: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Tabela `student_profiles`
```sql
- id: UUID (PK)
- user_id: UUID (FK -> users.id)
- current_course_id: VARCHAR(255)
- progress_percentage: DECIMAL(5,2) DEFAULT 0.00
- enrollment_date: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Tabela `user_sync_log`
```sql
- id: UUID (PK)
- user_id: UUID (FK -> users.id)
- wtl_user_id: VARCHAR(255)
- sync_type: VARCHAR(50)
- sync_status: VARCHAR(50)
- user_role: ENUM('student', 'teacher')
- last_sync_at: TIMESTAMP
- error_message: TEXT
- created_at: TIMESTAMP
```

## 🔄 Użycie systemu synchronizacji

### 1. Synchronizacja pojedynczego użytkownika

```typescript
import { UserSyncService } from '@/lib/user-sync-service'

const syncService = new UserSyncService()
const result = await syncService.syncUser('user@example.com')
```

### 2. Synchronizacja masowa

```typescript
// Wszyscy użytkownicy
const result = await syncService.syncAllUsers()

// Użytkownicy określonej roli
const result = await syncService.syncUsersByRole('teacher')
```

### 3. API Endpoints

```bash
# Synchronizacja pojedynczego użytkownika
POST /api/wtl/sync
{
  "syncType": "single",
  "email": "user@example.com"
}

# Synchronizacja masowa
POST /api/wtl/sync
{
  "syncType": "bulk"
}

# Synchronizacja po roli
POST /api/wtl/sync
{
  "syncType": "role",
  "role": "teacher"
}

# Statystyki synchronizacji
GET /api/wtl/sync

# Statystyki dla określonej roli
GET /api/wtl/sync?role=student
```

### 4. Skrypt CLI

```bash
# Synchronizacja masowa
node scripts/sync-users.js

# Synchronizacja pojedynczego użytkownika
node scripts/sync-users.js single user@example.com

# Synchronizacja po roli
node scripts/sync-users.js role teacher
```

## 📊 Monitoring i logi

### Statystyki synchronizacji
- Liczba użytkowników zsynchronizowanych
- Liczba błędów synchronizacji
- Rozkład ról (kursanci vs nauczyciele)
- Historia synchronizacji

### Logi w tabeli `user_sync_log`
- Typ operacji (create, update, delete)
- Status (success, failed, pending)
- Rola użytkownika
- Komunikaty błędów
- Timestamp operacji

## 🚨 Obsługa błędów

### Typowe błędy i rozwiązania

1. **Błąd połączenia z WTL API**
   - Sprawdź `WTL_API_URL` i `WTL_API_KEY`
   - Sprawdź limity API (3600/godzinę, 360/minutę)

2. **Błąd bazy danych**
   - Sprawdź połączenie z Supabase
   - Uruchom migracje: `npx supabase db push`

3. **Użytkownik nie znaleziony w WTL**
   - Użytkownik zostanie oznaczony jako `wtl_sync_status: 'failed'`
   - Błąd zostanie zalogowany w `user_sync_log`

## 🔄 Automatyzacja

### Cron job (Vercel)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/wtl/sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Integracja z procesem logowania

```typescript
// src/lib/auth.ts
export async function handleUserLogin(email: string) {
  // 1. Sprawdź/utwórz użytkownika w Supabase
  let user = await getUserByEmail(email)
  
  if (!user) {
    user = await createUser({ email })
  }
  
  // 2. Synchronizuj z WTL w tle
  const syncService = new UserSyncService()
  syncService.syncOnLogin(email).catch(console.error)
  
  return user
}
```

## 🧪 Testowanie

### 1. Test pojedynczego użytkownika

```bash
curl -X POST http://localhost:3000/api/wtl/sync \
  -H "Content-Type: application/json" \
  -d '{"syncType": "single", "email": "test@example.com"}'
```

### 2. Test synchronizacji masowej

```bash
curl -X POST http://localhost:3000/api/wtl/sync \
  -H "Content-Type: application/json" \
  -d '{"syncType": "bulk"}'
```

### 3. Sprawdzenie statystyk

```bash
curl http://localhost:3000/api/wtl/sync
```

## 📈 Metryki wydajności

- **Czas synchronizacji pojedynczego użytkownika**: ~100-500ms
- **Czas synchronizacji masowej**: zależy od liczby użytkowników
- **Limit API WTL**: 3600 requestów/godzinę
- **Zalecana częstotliwość**: co 6 godzin

## 🔒 Bezpieczeństwo

- Wszystkie endpointy wymagają autoryzacji
- Logi synchronizacji nie zawierają wrażliwych danych
- Rate limiting na poziomie API
- Walidacja danych wejściowych

## 🆘 Wsparcie

W przypadku problemów:
1. Sprawdź logi w konsoli przeglądarki
2. Sprawdź logi synchronizacji w tabeli `user_sync_log`
3. Sprawdź status połączenia z WTL API
4. Sprawdź połączenie z bazą danych Supabase
