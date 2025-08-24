# 🖥️ Skrypty CLI

## 📋 Dostępne skrypty

### **1. Test połączenia**
```bash
npm run test-connection
```
**Co robi:**
- Sprawdza zmienne środowiskowe
- Testuje połączenie z Supabase
- Sprawdza czy tabele istnieją
- Pokazuje statystyki bazy

### **2. Pełne CLI Supabase**
```bash
npm run supabase
```
**Co robi:**
- Interaktywne menu zarządzania bazą
- Zarządzanie użytkownikami
- Zarządzanie sesjami
- Czyszczenie starych danych

## 🚀 Jak używać

### **Krok 1: Skonfiguruj zmienne środowiskowe**
Utwórz plik `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### **Krok 2: Uruchom migrację SQL**
W Supabase Dashboard → SQL Editor uruchom:
```sql
-- Skopiuj zawartość z supabase/migrations/001_initial_schema.sql
```

### **Krok 3: Przetestuj połączenie**
```bash
npm run test-connection
```

### **Krok 4: Użyj pełnego CLI**
```bash
npm run supabase
```

## 🎯 Funkcje CLI

### **📊 Statystyki**
- Liczba użytkowników
- Liczba sesji
- Aktywne sesje

### **👥 Zarządzanie użytkownikami**
- Lista użytkowników
- Dodawanie użytkowników
- Usuwanie użytkowników
- Wyszukiwanie użytkowników

### **🔑 Zarządzanie sesjami**
- Lista sesji
- Status sesji (aktywna/wygasła)
- Czyszczenie starych sesji

### **📋 Struktura bazy**
- Lista tabel
- Szczegóły kolumn
- Relacje między tabelami

## 🔧 Rozwiązywanie problemów

### **Błąd: "Brak zmiennych środowiskowych"**
```bash
# Sprawdź czy plik .env.local istnieje
ls -la .env.local

# Sprawdź zawartość
cat .env.local
```

### **Błąd: "Tabela nie istnieje"**
1. Uruchom migrację SQL w Supabase Dashboard
2. Sprawdź czy tabele zostały utworzone
3. Uruchom ponownie test połączenia

### **Błąd: "Brak uprawnień"**
1. Sprawdź czy klucz API jest poprawny
2. Sprawdź czy projekt Supabase jest aktywny
3. Sprawdź czy RLS nie blokuje dostępu

## 💡 Wskazówki

- **Użyj `test-connection`** przed `supabase` CLI
- **Sprawdź logi** w Supabase Dashboard
- **Uruchom migrację** przed pierwszym użyciem
- **Backup danych** przed usuwaniem użytkowników

## 🆘 Wsparcie

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Community](https://github.com/supabase/supabase/discussions)
