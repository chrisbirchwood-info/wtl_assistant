# Roadmapa, Akceptacja i Kamienie Milowe

## Zakres (MVP)
- Użytkownicy: CRUD, wielorole, aktywacja/dezaktywacja, sync z WTL.
- Kursy: import z WTL; admin widzi listę lokalnych kursów; przypisuje nauczycieli.
- Lekcje: import z WTL; admin mapuje lekcje do kursu i ustala kolejność (drag&drop lub pozycje).
- Notatki: nauczyciel dodaje/edytuje tekstowe notatki do lekcji dla ucznia; student widzi je w portalu.

## Kryteria Akceptacji (MVP)
- Import po kliknięciu „Synchronizuj” dostarcza aktualne kursy i lekcje z WTL.
- Mapowanie: admin przypina/odpina lekcje do kursu; kolejność zapisana i odtwarzalna.
- Użytkownicy: admin tworzy/edytuje/usuwa, przypisuje role; role sterują dostępem do widoków/admin API.
- Przypisania nauczycieli: wielu nauczycieli per kurs; wgląd w przypisanych i ich role.
- Notatki: nauczyciel tworzy notatkę do lekcji w kontekście ucznia i kursu; student widzi ją w swoim portalu.

## Kamienie Milowe
M1 – Fundament
- [ ] Migracje: `roles`, `user_roles`; (opcjonalnie) rozszerzenie `notes` (author_id, course_id)
- [ ] Integracja WTL (read-only) i lista kursów/lekcji w admin (bez edycji)

M2 – Mapowania
- [ ] Migracje: `course_lessons`
- [ ] API mapowań: przypinanie/odpinanie/reorder
- [ ] UI kursu: zakładka „Lekcje” z drag&drop

M3 – Użytkownicy
- [ ] Admin Users: multi-roles w formularzach i PATCH/POST
- [ ] Endpoint `GET /api/admin/teachers`
- [ ] Przypisywanie nauczycieli do kursów (doprecyzowanie UX)

M4 – Notatki
- [ ] API `POST /api/teacher/notes`
- [ ] Widok nauczyciela i podgląd studenta (w istniejącym portalu)

M5 – Stabilizacja
- [ ] Audyt logów sync, monitoring, retry strategie
- [ ] Domknięcie RLS i polityk dostępu
- [ ] Dokumentacja admin i operacyjna

## Otwarte elementy/Decyzje (stan na start)
- Wielorole: wdrażamy `roles`/`user_roles`; większość UI przechodzi na `roles[]`, utrzymujemy kompatybilność z `users.role` przejściowo.
- Mapowanie lekcji: stawiamy `course_lessons` już w MVP (elastyczność i reorder per kurs).
- Widoczność notatek: „dla wszystkich” w ramach kontekstu ucznia/kursu; wersjonowanie później.
- Reorder lekcji: drag&drop w UI admin; fallback na ręczną edycję pozycji.
