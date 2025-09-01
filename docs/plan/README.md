# Plan Rozwoju i Referencja — WTL Assistant

Ten katalog zawiera uzgodniony plan rozwoju panelu admin (`/admin`), synchronizacji z WTL oraz funkcji notatek. Dokumenty są podzielone na sekcje: model danych, kontrakty API, UI admina, synchronizacja z WTL oraz roadmapa i kryteria akceptacji.

Powiązana dokumentacja WTL API (Postman): `docs/WebToLearn API.postman_collection.json`

## Spis treści
- Data Model: `docs/plan/data-model.md`
- API Contracts: `docs/plan/api-contracts.md`
- API Schemas (JSON): `docs/plan/api-schemas.md`
- Admin UI: `docs/plan/admin-ui.md`
- Synchronizacja WTL: `docs/plan/sync.md`
- Migracje (SQL szkice): `docs/plan/migrations.md`
- Roadmapa i Kryteria: `docs/plan/roadmap.md`
- Stan Repo i Zadania: `docs/plan/repo-touchpoints.md`

## Cel
- Ujednolicona synchronizacja kursów i lekcji z WTL (read-only, idempotentny upsert), przy jednoczesnym lokalnym mapowaniu lekcja↔kurs.
- Panel admin: zarządzanie użytkownikami (CRUD, wielorole), przypisywanie nauczycieli do kursów, mapowanie lekcji do kursów, trigger synchronizacji.
- Nauczyciele: notatki do lekcji w kontekście ucznia i kursu; studenci widzą notatki w istniejącym portalu.

## Założenia
- Źródłem prawdy dla definicji kursów/lekcji jest WTL; relacja kurs↔lekcje utrzymywana lokalnie.
- Uwierzytelnienie WTL: nagłówek `X-Auth-Token`; paginacja i sort zgodnie z Postmanem.
- Wielu nauczycieli per kurs; użytkownicy mogą mieć wiele ról (wielorole).
- Notatki: na teraz czysty tekst, widoczne dla wszystkich, edytowalne, bez wersjonowania.
- Reorder lekcji: preferowane drag&drop, dopuszczalny fallback przez numer pozycji.

---

Aktualizacje tego planu powinny trafiać do odpowiednich plików w tym katalogu.
