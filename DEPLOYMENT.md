# 🚀 Deployment na Vercel

## Wymagania

- Konto na [Vercel](https://vercel.com)
- Repozytorium na GitHub/GitLab/Bitbucket
- Skonfigurowane zmienne środowiskowe

## Krok 1: Przygotowanie repozytorium

1. **Zatwierdź zmiany** w repozytorium:
```bash
git add .
git commit -m "feat: implement OTP authentication system"
git push origin main
```

## Krok 2: Deployment na Vercel

### Opcja A: Przez Dashboard Vercel (Zalecane)

1. **Zaloguj się** na [vercel.com](https://vercel.com)
2. **Kliknij** "New Project"
3. **Wybierz** swoje repozytorium
4. **Skonfiguruj** projekt:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (domyślnie)
   - **Build Command**: `npm run build` (domyślnie)
   - **Output Directory**: `.next` (domyślnie)
   - **Install Command**: `npm install` (domyślnie)

### Opcja B: Przez CLI Vercel

1. **Zainstaluj** Vercel CLI:
```bash
npm i -g vercel
```

2. **Zaloguj się**:
```bash
vercel login
```

3. **Deploy**:
```bash
vercel
```

## Krok 3: Konfiguracja zmiennych środowiskowych

W dashboardzie Vercel, przejdź do **Settings → Environment Variables** i dodaj:

### Wymagane zmienne:

```env
# WebToLearn API
WTL_API_URL=https://teachm3.elms.pl/api/v1
WTL_API_KEY=your_webtolearn_api_key_here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Opcjonalne (jeśli używasz Supabase):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Krok 4: Uruchomienie deploymentu

1. **Kliknij** "Deploy" w dashboardzie Vercel
2. **Poczekaj** na zakończenie builda
3. **Sprawdź** czy aplikacja działa na wygenerowanym URL

## Krok 5: Konfiguracja domeny (opcjonalnie)

1. **Przejdź** do **Settings → Domains**
2. **Dodaj** swoją domenę
3. **Skonfiguruj** DNS zgodnie z instrukcjami Vercel

## Automatyczny deployment

Po pierwszym deploymencie:
- **Każdy push** do `main` branch automatycznie uruchomi nowy deployment
- **Pull requests** będą miały preview deployments
- **Możesz** skonfigurować branch protection rules

## Monitoring i logi

- **Analytics**: Vercel Analytics (opcjonalnie)
- **Logi**: Dashboard → Functions → View Function Logs
- **Performance**: Core Web Vitals w dashboardzie

## Troubleshooting

### Błąd builda
- Sprawdź logi w dashboardzie Vercel
- Upewnij się że wszystkie zależności są w `package.json`
- Sprawdź czy `npm run build` działa lokalnie

### Błąd runtime
- Sprawdź logi funkcji w dashboardzie
- Upewnij się że zmienne środowiskowe są ustawione
- Sprawdź czy API endpoints działają

### Problemy z autoryzacją
- Sprawdź `JWT_SECRET` w zmiennych środowiskowych
- Upewnij się że `WTL_API_KEY` jest poprawny
- Sprawdź czy `NEXT_PUBLIC_APP_URL` wskazuje na właściwy URL

## Koszty

- **Hobby Plan**: Darmowy (100GB bandwidth/miesiąc)
- **Pro Plan**: $20/miesiąc (1TB bandwidth/miesiąc)
- **Enterprise**: Kontakt z Vercel

## Wsparcie

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Vercel Support](https://vercel.com/support)
