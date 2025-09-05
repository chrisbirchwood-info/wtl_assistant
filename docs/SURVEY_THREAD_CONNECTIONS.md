# Połączenia Ankiet z Wątkami

## Opis funkcjonalności

System umożliwia linkowanie odpowiedzi z ankiet Google Forms do wątków uczniów. Pozwala to na:

- **Automatyczne tworzenie wątków** na podstawie odpowiedzi z ankiet
- **Łączenie istniejących wątków** z odpowiedziami z ankiet
- **Przeglądanie odpowiedzi z ankiet** w kontekście wątków uczniów
- **Zarządzanie połączeniami** przez nauczycieli

## Jak to działa

### Przepływ danych

1. **Uczeń wypełnia ankietę** Google Forms
2. **Nauczyciel synchronizuje** odpowiedzi przez panel ankiet
3. **System identyfikuje ucznia** na podstawie adresu email z odpowiedzi
4. **Nauczyciel może**:
   - Utworzyć nowy wątek na podstawie odpowiedzi
   - Połączyć odpowiedź z istniejącym wątkiem
   - Przeglądać szczegóły odpowiedzi

### Struktura bazy danych

#### Nowa tabela: `thread_survey_connections`
```sql
- id (uuid, PK)
- thread_id (uuid, FK → threads.id)
- survey_response_id (uuid, FK → survey_responses.id)
- connection_type ('survey_response' | 'manual')
- created_at (timestamp)
- created_by (uuid, FK → users.id)
```

#### Nowe funkcje
- `create_thread_from_survey_response()` - automatyczne tworzenie wątku
- `get_thread_survey_data()` - pobieranie danych ankiety dla wątku

## Instalacja i konfiguracja

### 1. Uruchom migrację bazy danych

```bash
node scripts/apply-survey-thread-migration.js
```

### 2. Sprawdź czy migracja została zastosowana

W Supabase Dashboard sprawdź czy istnieją:
- Tabela `thread_survey_connections`
- Funkcje `create_thread_from_survey_response` i `get_thread_survey_data`

### 3. Upewnij się, że masz skonfigurowane ankiety

1. Przejdź do `/teacher/[teacherId]/surveys`
2. Dodaj ankietę Google Forms
3. Połącz się z Google OAuth
4. Zsynchronizuj odpowiedzi

## Użycie

### Panel nauczyciela

Przejdź do `/teacher/[teacherId]/survey-threads` gdzie znajdziesz:

#### Zakładka "Niepołączone odpowiedzi"
- Lista odpowiedzi z ankiet, które nie są jeszcze połączone z wątkami
- Możliwość utworzenia nowego wątku dla każdej odpowiedzi
- Możliwość połączenia z istniejącym wątkiem

#### Zakładka "Połączone odpowiedzi"
- Lista odpowiedzi już połączonych z wątkami
- Podgląd szczegółów połączeń

### API Endpoints

#### Tworzenie wątku z ankiety
```typescript
POST /api/threads/survey-connections
{
  "survey_response_id": "uuid",
  "teacher_id": "uuid",
  "thread_title": "Opcjonalny tytuł",
  "thread_content": "Opcjonalna treść"
}
```

#### Łączenie z istniejącym wątkiem
```typescript
POST /api/threads/survey-connections
{
  "thread_id": "uuid",
  "survey_response_id": "uuid",
  "connection_type": "manual"
}
```

#### Pobieranie odpowiedzi z ankiet
```typescript
GET /api/surveys/responses?teacher_id=uuid&include_linked=false
```

#### Pobieranie danych ankiety dla wątku
```typescript
GET /api/threads/survey-connections?thread_id=uuid
```

## Komponenty UI

### `SurveyResponsesList`
Komponent do wyświetlania listy odpowiedzi z ankiet z możliwością:
- Przeglądania szczegółów odpowiedzi
- Tworzenia nowych wątków
- Łączenia z istniejącymi wątkami

### Strona `survey-threads`
Główny panel zarządzania połączeniami dla nauczycieli.

## Typy TypeScript

### Nowe typy
```typescript
interface ThreadSurveyConnection {
  id: string
  thread_id: string
  survey_response_id: string
  connection_type: 'survey_response' | 'manual'
  created_at: string
  created_by?: string
}

interface CreateThreadFromSurveyRequest {
  survey_response_id: string
  teacher_id: string
  thread_title?: string
  thread_content?: string
}

interface LinkSurveyToThreadRequest {
  thread_id: string
  survey_response_id: string
  connection_type?: 'survey_response' | 'manual'
}
```

## Bezpieczeństwo

### RLS Policies
- Nauczyciele mogą zarządzać połączeniami tylko dla swoich ankiet
- Uczniowie mogą przeglądać tylko swoje wątki
- Superadmini mają pełny dostęp

### Walidacja
- Sprawdzanie czy odpowiedź z ankiety należy do nauczyciela
- Walidacja istnienia ucznia na podstawie email z ankiety
- Zapobieganie duplikowaniu połączeń

## Troubleshooting

### Częste problemy

1. **Brak ucznia w systemie**
   - Upewnij się, że uczeń ma konto z tym samym emailem co w ankiecie
   
2. **Błąd uprawnień**
   - Sprawdź czy nauczyciel jest właścicielem ankiety
   
3. **Migracja nie została zastosowana**
   - Uruchom ponownie skrypt migracji
   - Sprawdź logi Supabase

### Logowanie
Wszystkie operacje są logowane w konsoli przeglądarki i serwerze.

## Rozwój

### Przyszłe funkcjonalności
- Automatyczne tworzenie wątków przy synchronizacji ankiet
- Powiadomienia o nowych odpowiedziach
- Grupowanie wątków według ankiet
- Eksport danych połączeń

### Testowanie
```bash
# Testowanie API
npm run test:api

# Testowanie komponentów
npm run test:components
```

## Wsparcie

W przypadku problemów:
1. Sprawdź logi w konsoli przeglądarki
2. Sprawdź logi Supabase
3. Skontaktuj się z administratorem systemu
