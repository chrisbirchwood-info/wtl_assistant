# WTL Assistant

System zarządzania WebToLearn z OTP (One-Time Password) authentication.

## Funkcje

- 🔐 **OTP Authentication** - Logowanie przez email + kod jednorazowy
- 🌐 **Integracja z WebToLearn API** - Pełny dostęp do danych WTL
- 📱 **Nowoczesny UI** - Zbudowany z Next.js 15 i Tailwind CSS
- 🔒 **Bezpieczne sesje** - JWT tokens z automatycznym wygaśnięciem
- ⚡ **Szybkie logowanie** - Prosty proces: email → OTP → zalogowany

## Jak to działa

### OTP Authentication
1. **Użytkownik** wpisuje email na `/auth/login`
2. **System** weryfikuje email w WebToLearn API
3. **Pokazuje** pole do wpisania kodu OTP
4. **Użytkownik** wpisuje kod (555555)
5. **System** weryfikuje OTP i loguje użytkownika
6. **Przekierowanie** do głównej aplikacji `/wtl`

### Integracja z WebToLearn
- Weryfikacja użytkowników przez `GET /user/by-email/:email`
- Dostęp do wszystkich endpointów WTL API
- Automatyczne dekodowanie danych Unicode z API

## Instalacja

1. **Klonuj repozytorium**
```bash
git clone https://github.com/your-username/wtl_assistant.git
cd wtl_assistant
```

2. **Zainstaluj zależności**
```bash
npm install
```

3. **Skonfiguruj zmienne środowiskowe**
```bash
cp env.example .env.local
```

4. **Uzupełnij `.env.local`**
```env
# WebToLearn API
WTL_API_URL=https://your-platform.elms.pl/api/v1
WTL_API_KEY=your_api_token_from_wtl_admin

# JWT Secret (wygeneruj bezpieczny klucz)
JWT_SECRET=your-super-secret-jwt-key

# URL aplikacji
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. **Uruchom aplikację**
```bash
npm run dev
```

## Logowanie

### Testowe dane
- **Email**: dowolny email z systemu WebToLearn
- **OTP**: `555555` (hardcodowane na razie)

### Proces logowania
1. Wpisz email (ten sam co w WebToLearn)
2. Kliknij "Wyślij hasło jednorazowe (OTP)"
3. Wpisz kod OTP: `555555`
4. Kliknij "Zaloguj się"

## Struktura projektu

```
src/
├── app/
│   ├── api/auth/          # API endpoints dla autoryzacji
│   ├── auth/              # Strony logowania
│   └── wtl/               # Główna aplikacja (chroniona)
├── components/
│   ├── auth/              # Komponenty autoryzacji
│   └── ui/                # Komponenty UI
├── lib/
│   ├── auth.ts            # Funkcje autoryzacji (OTP)
│   └── wtl-client.ts      # Klient WebToLearn API
└── store/
    └── auth-store.ts      # Store autoryzacji (Zustand)
```

## API Endpoints

### Autoryzacja
- `POST /api/auth/login` - Logowanie przez email + OTP

### WebToLearn
- `GET /api/wtl/projects` - Pobiera projekty/kursy
- `GET /api/wtl/lessons` - Pobiera lekcje
- `GET /api/wtl/tasks` - Pobiera zadania

## Bezpieczeństwo

- **OTP** - kod jednorazowy (na razie hardcodowany)
- **Sesja JWT** wygasa po 7 dniach
- **Weryfikacja użytkowników** przez WebToLearn API
- **Bezpieczne przechowywanie** tokenów w localStorage

## Rozwój

### Dodawanie nowych endpointów WTL
1. Dodaj metodę w `src/lib/wtl-client.ts`
2. Stwórz API route w `src/app/api/wtl/`
3. Użyj w komponencie React

### Modyfikacja UI
- Strony logowania: `src/app/auth/`
- Główna aplikacja: `src/app/wtl/`
- Komponenty: `src/components/`

## Deployment

### Vercel (zalecane)
1. Połącz repozytorium z Vercel
2. Ustaw zmienne środowiskowe w dashboardzie
3. Deploy automatyczny przy push

### Inne platformy
- Upewnij się że `NEXT_PUBLIC_APP_URL` wskazuje na właściwy URL
- Ustaw bezpieczny `JWT_SECRET`

## Wsparcie

- **Dokumentacja API**: `docs/WebToLearn API.postman_collection.json`
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

## Licencja

MIT License - zobacz [LICENSE](LICENSE) dla szczegółów.
