# Admin UI — Zakres i Widoki

## Użytkownicy
- Lista: filtrowanie po roli/statusie; wykluczenie superadmina z listy operacyjnej.
- Formularz: tworzenie i edycja (email, username, status); przypisanie wielu ról (multi-select z `roles`).
- Akcje: aktywacja/dezaktywacja, reset hasła (później), synchronizacja z WTL (globalna akcja).

## Kursy
- Lista: nazwa, status sync, data ostatniej synchronizacji, akcja „Synchronizuj”.
- Szczegóły kursu: zakładki
  - Nauczyciele: lista przypisanych (rola, assigned_at), dodawanie/usuwanie; wspiera wielu nauczycieli per kurs.
  - Lekcje: mapowanie lekcji do kursu —
    - Wyszukiwanie globalnych lekcji (po tytule/ID WTL), dodaj do kursu.
    - Lista przypiętych lekcji z `position` i `required`.
    - Reorder drag&drop (fallback: edycja numeru pozycji), zapisywany przez `PATCH /lessons/reorder`.

## Lekcje (globalnie)
- Lista wszystkich lekcji z bazy (przegląd, debug), info o źródle i `last_sync_at`.
- Akcja „Synchronizuj lekcje” (globalnie przez /admin/lessons/sync).

## Notatki
- (Admin) Brak edycji treści — tylko wgląd (opcjonalnie). Główny flow w widokach nauczyciela/studenta.

## Kontrola dostępu
- Gating po wieloroli: `hasRole('admin')` do sekcji `/admin/**`.
- W okresie przejściowym zachować kompatybilność z `user.role === 'superadmin'` tam, gdzie jeszcze używane.

## UX / stan aplikacji
- Spójne bannery efektów (sukces/błąd) przy akcjach sync/przypisań.
- Paginacja/listy do 1000 elementów z lazy fetch, zgodnie z limitami WTL.
- Łagodne fallbacki gdy brak danych z WTL (mocki tylko dla dev, nie w produkcji panelu admin).
