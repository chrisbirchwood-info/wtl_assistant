# Synchronizacja z WTL — Strategia i Przepływy

## Endpointy WTL (Postman)
- Kursy: `GET /training/list?range=[0,1000]&sort=["name","ASC"]`
- Lekcje globalne: `GET /lesson/list?range=[0,1000]&sort=["order","ASC"]`
- Lekcje dla kursu:
  - `GET /lesson/list?range=[0,1000]&filter=[{"field":"training_id","type":"equals","value":"{id}"}]&sort=["order","ASC"]`
  - lub `GET /training/{id}/lesson/list?range=[0,1000]&sort=["order","ASC"]`
- Użytkownicy: `GET /user/list?range=[0,1000]&sort=["id","ASC"]`
- Autoryzacja: nagłówek `X-Auth-Token`

## Zasady synchronizacji
- Idempotentny upsert po `wtl_course_id` i `wtl_lesson_id`.
- Aktualizacja danych oraz `last_sync_at`; brak kasowania mapowań lokalnych przy zniknięciu rekordów w WTL.
- Obsługa rate limitów i paginacji (`range=[offset,limit]`), krótkie timeouty na próbach alternatywnych endpointów.
- Logowanie przebiegów (liczby dodane/zaktualizowane/błędy) do `sync_log`.

## Tryby wywołania
- Ręcznie z panelu admin: przyciski „Synchronizuj kursy/lekcje”.
- Automatycznie: cron/Vercel schedule (po MVP, gdy potrzebne).

## Konflikty i spójność
- Relacja kurs↔lekcja utrzymywana lokalnie w `course_lessons`; sync lekcji nie modyfikuje mapowań.
- Oznaczanie nieistniejących już zdalnie lekcji – opcjonalnie `remote_deleted` (do rozważenia); obecnie — badge „zniknęła w WTL” po wykryciu różnic.
- Transakcje dla batchy upsertów; defensywne mapowanie pól z WTL (różne nazwy: `id|lesson_id|lessonId`, `title|name|lesson_name`, `order|order_number|position|sequence`).

## Przepływy kluczowe
1) Admin klika „Synchronizuj kursy” → import listy kursów do `courses` (upsert po `wtl_course_id`).
2) Admin klika „Synchronizuj lekcje” → dla każdego kursu próba pobrania lekcji; upsert do `lessons`.
3) Mapowanie lekcji: admin przypina lekcje do kursu w UI (drag&drop), zapis do `course_lessons`.

## Metryki i diagnostyka
- Zliczanie: dodane/zaktualizowane/błędy per encja.
- Retriable błędy sieciowe; telemetry (czas, statusy) w logach.
- Debug endpoint (już istnieje dla lekcji) z podglądem wykrytych pól.
