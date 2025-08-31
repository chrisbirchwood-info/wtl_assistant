# 🔍 Rozwiązywanie problemów z synchronizacją lekcji

## Problem: Nie wszystkie lekcje są synchronizowane z WTL API

### 🚨 Najczęstsze przyczyny:

1. **Błędne mapowanie pól z WTL API**
   - WTL API może używać różnych nazw pól niż oczekiwane
   - Pola mogą być zagnieżdżone w różnych strukturach odpowiedzi

2. **Nieprawidłowe endpointy WTL API**
   - Różne wersje API mogą mieć inne endpointy
   - Parametry query mogą być niepoprawne

3. **Problemy z autoryzacją**
   - Brak lub nieprawidłowy klucz API
   - Nieprawidłowe nagłówki autoryzacji

4. **Filtrowanie lekcji**
   - Lekcje mogą być pomijane z powodu błędnych warunków filtrowania
   - Pola ID lub tytułu mogą być puste lub w innym formacie

### 🛠️ Rozwiązania:

#### 1. Użyj narzędzia debugowania

W panelu administracyjnym lekcji (`/admin/lessons`) kliknij przycisk **"🔍 Debuguj synchronizację"**.

To narzędzie:
- Testuje różne endpointy WTL API
- Sprawdza format danych zwracanych przez API
- Analizuje mapowanie pól
- Generuje zalecenia naprawcze

#### 2. Sprawdź zmienne środowiskowe

Upewnij się, że masz ustawione:
```bash
WTL_API_URL=https://teachm3.elms.pl/api/v1
WTL_API_KEY=twój_klucz_api
```

#### 3. Sprawdź logi serwera

W konsoli serwera szukaj komunikatów:
- `🌐 Próbuję endpoint: ...`
- `✅ Pobrano X lekcji z endpointu: ...`
- `⚠️ Pomijam lekcję bez ID lub tytułu: ...`
- `❌ Błąd dla endpointu ...`

#### 4. Ręczne testowanie endpointów

Możesz przetestować endpointy WTL API bezpośrednio:

```bash
# Test 1: Podstawowy endpoint
curl -H "X-Auth-Token: TWÓJ_KLUCZ_API" \
  "https://teachm3.elms.pl/api/v1/lesson/list?training_id=ID_KURSU&range=[0,1000]"

# Test 2: Endpoint z filtrem
curl -H "X-Auth-Token: TWÓJ_KLUCZ_API" \
  "https://teachm3.elms.pl/api/v1/lesson/list?range=[0,1000]&filter=[{\"field\": \"training_id\", \"type\": \"equals\", \"value\": \"ID_KURSU\"}]"

# Test 3: Endpoint z training
curl -H "X-Auth-Token: TWÓJ_KLUCZ_API" \
  "https://teachm3.elms.pl/api/v1/training/ID_KURSU/lesson/list?range=[0,1000]"
```

### 🔧 Poprawki w kodzie:

#### 1. Lepsze mapowanie pól

Kod został zaktualizowany, aby obsługiwać różne formaty pól:

```typescript
// ID lekcji - sprawdź różne możliwe pola
const lessonId = wtlLesson.id || wtlLesson.lesson_id || wtlLesson.lessonId

// Tytuł lekcji - sprawdź różne możliwe pola
const lessonTitle = wtlLesson.title || wtlLesson.name || wtlLesson.lesson_name

// Opis lekcji - sprawdź różne możliwe pola
const lessonDescription = wtlLesson.description || wtlLesson.summary || wtlLesson.content_summary

// Kolejność lekcji - sprawdź różne możliwe pola
const lessonOrder = wtlLesson.order_number || wtlLesson.order || wtlLesson.position || wtlLesson.sequence
```

#### 2. Testowanie wielu endpointów

System automatycznie testuje różne endpointy:
1. `/lesson/list?training_id=${courseId}&range=[0,1000]`
2. `/lesson/list?range=[0,1000]&filter=[{"field": "training_id", "type": "equals", "value": "${courseId}"}]`
3. `/training/${courseId}/lesson/list?range=[0,1000]`

#### 3. Fallback do paginacji

Jeśli żaden endpoint nie zadziała, system próbuje pobrać lekcje z paginacją.

### 📊 Monitorowanie:

#### 1. Statystyki synchronizacji

Po synchronizacji sprawdź:
- Liczba utworzonych lekcji
- Liczba zaktualizowanych lekcji
- Liczba błędów
- Szczegóły błędów

#### 2. Porównanie z WTL API

Użyj narzędzia debugowania, aby porównać:
- Liczba lekcji w WTL API
- Liczba lekcji w bazie danych
- Różnice w mapowaniu pól

### 🚀 Optymalizacje:

#### 1. Buforowanie odpowiedzi

System buforuje odpowiedzi WTL API, aby uniknąć wielokrotnych wywołań.

#### 2. Obsługa błędów

System automatycznie obsługuje błędy i próbuje alternatywne endpointy.

#### 3. Logowanie

Wszystkie operacje są szczegółowo logowane dla łatwiejszego debugowania.

### 📞 Wsparcie:

Jeśli problemy nadal występują:

1. **Sprawdź logi serwera** - szukaj komunikatów błędów
2. **Użyj narzędzia debugowania** - analizuje problemy automatycznie
3. **Sprawdź dokumentację WTL API** - może być aktualizowana
4. **Skontaktuj się z administratorem** - może być problem z konfiguracją API

### 🔄 Automatyczne naprawy:

System automatycznie:
- Próbuje różne endpointy
- Obsługuje różne formaty danych
- Mapuje różne nazwy pól
- Loguje wszystkie problemy
- Generuje zalecenia naprawcze

---

**Uwaga:** Ten dokument jest aktualizowany na bieżąco. Jeśli znajdziesz nowe problemy lub rozwiązania, zgłoś je administratorowi.
