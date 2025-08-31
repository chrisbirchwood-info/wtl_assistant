# 🌍 Konfiguracja środowisk

Ten projekt obsługuje dwa środowiska: **lokalne (development)** i **produkcyjne (production)**.

## 📁 Pliki środowiskowe

- `.env.local` - Środowisko lokalne (lokalna baza Supabase)
- `.env.prod` - Środowisko produkcyjne (zdalna baza Supabase)
- `.env.local.active` - Aktywny plik (generowany automatycznie)

## 🚀 Szybkie przełączanie

### **Przełącz na lokalne środowisko:**
```bash
npm run env:local
```

### **Przełącz na produkcyjne środowisko:**
```bash
npm run env:prod
```

### **Sprawdź aktualne środowisko:**
```bash
npm run env:status
```

## 🔧 Ręczne przełączanie

### **Skrypt Node.js:**
```bash
node scripts/switch-env.js local    # Lokalne
node scripts/switch-env.js prod     # Produkcyjne
node scripts/switch-env.js status   # Status
```

### **Kopiowanie plików:**
```bash
# Windows
copy .env.local .env.local.active
copy .env.prod .env.local.active

# Linux/Mac
cp .env.local .env.local.active
cp .env.prod .env.local.active
```

## 🌐 Uruchamianie z różnymi środowiskami

### **Development (lokalna baza):**
```bash
npm run dev:local
```

### **Production (zdalna baza):**
```bash
npm run dev:prod
```

### **Build z różnymi środowiskami:**
```bash
npm run build:local    # Build z lokalną bazą
npm run build:prod     # Build z zdalną bazą
```

## 📋 Struktura plików środowiskowych

### **`.env.local` (Lokalne):**
```bash
# Supabase - LOKALNE
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **`.env.prod` (Produkcyjne):**
```bash
# Supabase - ZDALNE
NEXT_PUBLIC_SUPABASE_URL=https://ntvsycffgjgaqtdymwsd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=twój_zdalny_anon_key
SUPABASE_SERVICE_ROLE_KEY=twój_zdalny_service_role_key
```

## 🔒 Bezpieczeństwo

- Pliki `.env*` są w `.gitignore`
- **NIGDY nie commituj** kluczy API
- Używaj lokalnej bazy do developmentu
- Zdalną bazę zostaw na produkcję

## 🚨 Rozwiązywanie problemów

### **Błąd "Invalid API key":**
1. Sprawdź czy `.env.local.active` istnieje
2. Uruchom `npm run env:status`
3. Przełącz środowisko: `npm run env:local`

### **Błąd połączenia z bazą:**
1. Sprawdź czy lokalna baza jest uruchomiona: `npm run supabase:status`
2. Uruchom lokalną bazę: `npm run supabase:start`

## 📚 Przydatne komendy

```bash
# Supabase
npm run supabase:start      # Uruchom lokalną bazę
npm run supabase:stop       # Zatrzymaj lokalną bazę
npm run supabase:status     # Status lokalnej bazy
npm run supabase:db:reset   # Reset lokalnej bazy

# Środowiska
npm run env:local           # Przełącz na lokalne
npm run env:prod            # Przełącz na produkcyjne
npm run env:status          # Pokaż status

# Development
npm run dev:local           # Dev z lokalną bazą
npm run dev:prod            # Dev z zdalną bazą
```

