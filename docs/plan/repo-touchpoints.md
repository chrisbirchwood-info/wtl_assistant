# Stan Repo i Miejsca Zmian (Touchpoints)

Poniżej lista kluczowych plików oraz planowanych zmian, tak aby wdrożyć uzgodnione funkcje bez nadmiarowych refaktorów.

## Klient WTL
- `src/lib/wtl-client.ts`
  - Utrzymuje integracje i fallbacki endpointów; korzysta z `X-Auth-Token`.
  - OK do użycia w sync kursów/lekcji oraz użytkowników.

## Sync kursów/lekcji
- `src/lib/course-sync-service.ts`
  - Import kursów (WTL trainings) i lekcji do tabeli `lessons` (upsert po `wtl_lesson_id`).
  - Do utrzymania: nie dotyka lokalnych mapowań.
- `src/app/api/admin/lessons/sync/route.ts`
  - Globalny sync lekcji dla wszystkich kursów — zostaje.

## Admin — Kursy i nauczyciele
- `src/app/admin/courses/page.tsx`
  - Lista kursów, przypisywanie nauczycieli — zostaje, UX do dopracowania.
- `src/app/api/admin/courses/[courseId]/teachers/route.ts`
  - GET/POST/DELETE przypisań w `course_teachers` (soft delete) — OK.
- [Brakujące] `src/app/api/admin/teachers/route.ts`
  - Dodać endpoint listujący nauczycieli (`user_roles`).

## Admin — Lekcje i mapowanie (nowe)
- Migracja `course_lessons`.
- Nowe endpointy:
  - `src/app/api/admin/courses/[courseId]/lessons/route.ts` (GET/POST)
  - `src/app/api/admin/courses/[courseId]/lessons/reorder/route.ts` (PATCH)
  - `src/app/api/admin/courses/[courseId]/lessons/[lessonId]/route.ts` (DELETE)
- UI:
  - Rozszerzyć `src/app/admin/courses/page.tsx` o zakładkę „Lekcje” z drag&drop / fallback numery.

## Admin — Użytkownicy (wielorole)
- `src/app/admin/users/page.tsx`
  - Dodać multi-select ról (po migracji), zachowując kompatybilność z dotychczasowym `role`.
- `src/app/api/admin/users/route.ts`
  - `POST/PATCH` – obsługa `roles: string[]` i zapis do `user_roles`.

## Notatki
- `src/app/notes/page.tsx`
  - Widok użytkownika; dodać filtrowanie po kursie/lekcji.
- [Nowe] `src/app/api/teacher/notes/route.ts`
  - Tworzenie notatki przez nauczyciela (author_id), skojarzonej z uczniem/kurs/lekcją.
- Migracje `notes`: `author_id`, `course_id`.

## Auth/Store
- `src/lib/auth.ts`, `src/store/auth-store.ts`, `src/lib/supabase.ts`
  - Rozszerzyć `UserSession` o `roles: string[]` i dodać helper `hasRole()` po stronie UI.
  - W okresie przejściowym obsłużyć oba podejścia (`role` i `roles[]`).
