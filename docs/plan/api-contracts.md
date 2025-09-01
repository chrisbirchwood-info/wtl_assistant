# Kontrakty API (Admin, Sync, Notatki)

Uwaga: ścieżki są względem Next.js app routes (np. `src/app/api/...`). Ochrona uprawnień po stronie panelu admin i weryfikacja ról po stronie API.

## Użytkownicy (Admin)
- `GET /api/admin/users`
  - Zwraca: listę użytkowników (podstawowe pola)
- `POST /api/admin/users`
  - Body: `{ email, password, roles?: string[], username?: string, is_active?: boolean }`
  - Efekt: tworzy użytkownika + przypisuje role (jeśli podano)
- `PATCH /api/admin/users`
  - Body: `{ id, email?, is_active?, username?, roles?: string[] }`
  - Efekt: aktualizuje użytkownika i (opcjonalnie) role przez `user_roles`
- `DELETE /api/admin/users/{id}`
  - Efekt: usuwa/dezaktywuje użytkownika (wg polityki)
- `PUT /api/admin/users` (sync)
  - Body: `{ action: "sync-wtl" }`
  - Efekt: masowa synchronizacja użytkowników z WTL

## Nauczyciele (Admin)
- NOWE: `GET /api/admin/teachers`
  - Query: `?active=true|false` (opcjonalnie)
  - Zwraca: użytkowników posiadających rolę `teacher` (z `user_roles`)

## Kursy (Admin)
- `GET /api/admin/courses`
  - Zwraca: listę kursów lokalnych
- `POST /api/courses/sync`
  - Efekt: synchronizuje kursy z WTL (tylko upsert po `wtl_course_id`)
- Przypisywanie nauczycieli do kursu:
  - `GET /api/admin/courses/{courseId}/teachers`
  - `POST /api/admin/courses/{courseId}/teachers` Body: `{ teacherId, role?, assignedBy }`
  - `DELETE /api/admin/courses/{courseId}/teachers` Body: `{ teacherId }` (soft delete `is_active=false`)

## Lekcje (mapowanie lokalne, Admin)
- NOWE: `GET /api/admin/courses/{courseId}/lessons`
  - Zwraca: listę przypiętych lekcji z `course_lessons` (pozycje)
- NOWE: `POST /api/admin/courses/{courseId}/lessons`
  - Body: `{ lesson_id }`
  - Efekt: przypina lekcję do kursu na koniec kolejki (auto `position`)
- NOWE: `PATCH /api/admin/courses/{courseId}/lessons/reorder`
  - Body: `{ items: [{ lesson_id, position }, ...] }`
  - Efekt: atomowy reorder pozycji dla kursu
- NOWE: `DELETE /api/admin/courses/{courseId}/lessons/{lessonId}`
  - Efekt: odpina lekcję od kursu

## Lekcje (sync)
- `POST /api/admin/lessons/sync`
  - Efekt: pobiera lekcje dla lokalnych kursów i upsertuje do `lessons` (bez mapowania)
- `GET /api/admin/lessons`
  - Zwraca: globalną listę lekcji (przegląd)

## Notatki
- `GET /api/notes?student_id?&course_id?&lesson_id?&include_connections?`
  - Zwraca: notatki; opcjonalnie z powiązaniami do lekcji
- `POST /api/notes` (ogólne tworzenie notatki użytkownika)
  - Body: `{ title, content, lesson_ids?: string[], connection_types?: string[] }`
- NOWE: `POST /api/teacher/notes`
  - Body: `{ student_id, course_id, lesson_id?, content }`
  - Efekt: tworzy notatkę w imieniu nauczyciela (author_id), przypisaną do ucznia/kursu/lekcji

## Uprawnienia (RBAC)
- Admin (rola `admin` lub `superadmin` w okresie przejściowym): pełny dostęp do `/api/admin/**` i sync.
- Teacher: dostęp do swoich kursów/uczniów, tworzenie/przegląd notatek.
- Student: własne notatki (poza `/admin`).

## Kształt odpowiedzi (przykłady skrótowe)
- Sukces: `{ success: true, ... }`
- Błąd: `{ success: false, message, error? }` lub `{ error, details? }`
