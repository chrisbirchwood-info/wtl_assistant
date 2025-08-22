# WTL Assistant - Dokumentacja

## Przegląd projektu

WTL Assistant to skalowalna aplikacja webowa zbudowana z Next.js 15, Supabase i integracją z Web To Learn API.

## Struktura projektu

```
wtl_assistant/
├── docs/                    # Dokumentacja projektu
├── src/
│   ├── app/
│   │   ├── api/wtl/        # API Routes dla WTL
│   │   ├── wtl/            # Strona WTL Dashboard
│   │   ├── layout.tsx      # Główny layout
│   │   └── page.tsx        # Strona główna
│   ├── components/         # Komponenty React
│   ├── lib/               # Biblioteki i konfiguracja
│   └── hooks/             # Custom hooks
├── public/                # Pliki statyczne
└── package.json          # Zależności projektu
```

## Konfiguracja

### Zmienne środowiskowe

Skopiuj `env.example` do `.env.local` i uzupełnij:

```bash
# Web To Learn API
WTL_API_URL=https://teachm3.elms.pl/api/v1
WTL_API_KEY=your-api-token-from-wtl-admin-panel

# Supabase (opcjonalnie)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Jak uzyskać API Token WTL

1. Zaloguj się do https://teachm3.elms.pl
2. Przejdź do **Panel administracyjny**
3. **Konfiguracja Platformy** → **API**
4. Skopiuj **API Token**

## Uruchamianie

### Lokalnie
```bash
npm install
npm run dev
```

### Deployment na Vercel
```bash
vercel --prod
```

## API Endpoints

### WTL Integration
- `GET /api/wtl/projects` - Lista projektów/kursów
- `GET /api/wtl/tasks` - Lista zadań
- `GET /api/wtl/test` - Test połączenia z WTL API
- `GET /api/wtl/test-public` - Test publicznych endpointów

### Aplikacja
- `/` - Strona główna
- `/wtl` - WTL Dashboard

## Funkcjonalności

### WTL Dashboard
- 📊 Analytics cards z statystykami
- 📁 Panel projektów/kursów
- ✅ Panel zadań
- 🔄 Synchronizacja z WTL API
- 💾 Cache w Supabase

### Źródła danych
1. **WTL API** (priorytet) - prawdziwe dane z teachm3.elms.pl
2. **Supabase cache** - dane z poprzednich synchronizacji
3. **Mock data** - dane demonstracyjne

### Status połączenia
- 🌐 **Zielony badge**: Połączono z WTL API
- 💾 **Niebieski badge**: Dane z cache
- 📋 **Żółty badge**: Dane demonstracyjne
- ❌ **Czerwony badge**: Błąd połączenia

## Troubleshooting

### Nie widać prawdziwych danych
1. Sprawdź czy API Token jest ustawiony w Vercel
2. Sprawdź logi w konsoli przeglądarki (F12)
3. Przetestuj połączenie: `/api/wtl/test`

### Błędy 403 Forbidden
- Sprawdź czy API Token jest poprawny
- Upewnij się że token pochodzi z Panel administracyjny → API

### Wolne ładowanie
- Dane są cache'owane w Supabase dla lepszej wydajności
- Pierwsze ładowanie może trwać dłużej

## Kontakt

W przypadku problemów z integracją WTL API, skontaktuj się z administratorem platformy teachm3.elms.pl.
