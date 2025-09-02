# System Mentoringowy — Plan Rozwoju (MVP → ++)

## Cel Aplikacji
Stworzenie systemu wspierającego proces mentoringu, umożliwiającego monitorowanie postępów uczestników, organizację zadań, komunikację między mentorem a uczestnikami oraz zarządzanie etapami programu mentoringowego.

## Zakres i Priorytety
- MVP: ankieta startowa, zadania (lekcyjne + dodatkowe), statusy + daty, konsultacje z notatkami, notyfikacje, dashboard mentora z postępami.
- Po MVP: automatyczne przypomnienia, feedback/komentarze, wskaźniki zaangażowania, historia działań, integracje z dokumentami, PWA/mobile.

## Role i Uprawnienia
- Uczestnik: otrzymuje materiały, wykonuje zadania, uczestniczy w konsultacjach, śledzi postępy.
- Mentor: zarządza uczestnikami, dodaje zadania, monitoruje postępy, udziela feedbacku.

## Funkcjonalności (Uczestnik)
- Ankieta startowa: wypełnienie na początku programu; zapis z datą; edycja do T+48h (potem read‑only).
- Lekcje i zadania: dostęp do lekcji; lista zadań per lekcja; oznaczanie jako wykonane z datą ukończenia.
- Zadania dodatkowe: przydzielane po konsultacjach; możliwość dodawania linków (np. do oferty/dokumentu).
- Konsultacje: lista i szczegóły; podgląd notatek mentora.
- Powiadomienia: o nowych zadaniach, komentarzach mentora, nadchodzących konsultacjach.

## Funkcjonalności (Mentor)
- Przegląd uczestników: lista z metrykami (ankieta, % zadań, konsultacje, aktywność).
- Monitorowanie postępów: wskaźniki aktywności, alerty zaległości.
- Konsultacje: tworzenie, notatki, szybkie zadania dodatkowe wynikające z konsultacji.
- Feedback: komentarze i akceptacja zadań.
- Przypomnienia/alerty: automatyczne przypomnienia o niewykonanych zadaniach i zbliżających się konsultacjach.

## Model Danych (Supabase)
- `users`: istniejąca (role: `student`/`mentor`/`superadmin`).
- `surveys_start`: id, user_id, answers jsonb, filled_at.
- `tasks`: id, title, description, source enum('lesson','consultation','custom'), lesson_id uuid?, created_by uuid, is_extra bool, default_links jsonb, due_date timestamptz?, created_at.
- `task_assignments`: id, task_id, participant_id, assigned_by, assigned_at.
- `task_status`: id, assignment_id, status enum('todo','in_progress','done','accepted'), updated_at, completed_at, links jsonb[].
- `consultations`: id, mentor_id, participant_id, scheduled_at, status enum('planned','done','missed'), summary text, created_at.
- `consultation_notes`: id, consultation_id, author_id, content text, created_at.
- `comments`: id, entity_type enum('task','consultation'), entity_id, author_id, content, created_at.
- `notifications`: id, user_id, type, payload jsonb, sent_at, read_at.
- `reminders_queue`: id, user_id, type, due_at, payload jsonb, status enum('pending','sent','failed').
- `activity_log`: id, user_id, action, entity, entity_id, metadata jsonb, created_at.
- Widoki (opcjonalnie materializowane):
  - `v_participant_progress`: % zadań done/accepted, ostatnia aktywność, liczba konsultacji.
  - `v_mentor_overview`: agregaty per uczestnik i kurs.

## RLS — Szkic
- `surveys_start`: uczestnik SELECT/INSERT/UPDATE własnej; mentor SELECT dla powiązanego uczestnika.
- `tasks`/`task_assignments`/`task_status`: uczestnik SELECT/UPDATE własnych assignmentów; mentor SELECT/INSERT/UPDATE dla przypisanych uczestników (JOIN przez kurs albo mapę participant_mentor).
- `consultations`/`consultation_notes`: strony konsultacji + superadmin.
- `comments`: autor + strony encji.
- `notifications`/`activity_log`: owner; mentor tylko agregaty (raporty) bez PII.

## API — Kontrakty (Next.js /api)
- Ankiety: `POST/GET /api/surveys/start` (uczestnik), `GET /api/surveys/start?userId=...` (mentor).
- Zadania: `POST /api/tasks`, `POST /api/tasks/assign`, `GET /api/participants/{id}/tasks`, `PATCH /api/tasks/status` (assignment_id + status + links).
- Konsultacje: `POST/GET /api/consultations`, `GET /api/consultations/{id}`, `POST /api/consultations/{id}/notes`.
- Komentarze: `POST /api/comments`, `GET /api/comments?entity=task|consultation&id=...`.
- Notyfikacje: `GET /api/notifications`, `PATCH /api/notifications/{id}/read`.
- Przypomnienia (cron): `POST /api/reminders/run` (Vercel Cron, idempotentne okna czasowe).
- Raporty: `GET /api/reports/mentor/overview?mentorId=...`, `GET /api/reports/participant/{id}/progress`.

## Widoki / Nawigacja (App Router)
- Uczestnik: `/survey/start`, `/lessons`, `/tasks`, `/consultations`.
- Mentor: `/teacher/[mentorId]/dashboard`, `/teacher/[mentorId]/participants`, `/teacher/[mentorId]/participants/[participantId]`.
- Wątki (wdrożone):
  - Lista: `/teacher/[teacherId]/students/[studentId]/threads`
  - Detale: `/teacher/[teacherId]/students/[studentId]/threads/[threadId]`

## Powiadomienia i Przypomnienia
- E‑mail + in‑app: nowe zadanie/komentarz/konsultacja; przypomnienia o terminach (T‑48h, T‑24h).
- Mechanizm: Vercel Cron → `/api/reminders/run` → wysyłka + wpis do `notifications`.

## Historia Działań
- `activity_log`: wypełnienie ankiety, zmiana statusu zadania (z datą), komentarze, konsultacje, wątki.
- Widok chronologiczny na karcie uczestnika.

## Wskaźniki i Raporty
- Uczestnik: % ukończenia, średni czas, ostatnia aktywność.
- Mentor: heatmapa zaległości, lista “at risk”, liczba konsultacji/tydzień.

## Integracje z Dokumentami
- MVP: linki URL w `task_status.links` (walidacja, mini‑podgląd).
- 2. etap: upload do Supabase Storage (bucket `task-attachments`).

## Plan Iteracyjny (2–3 Tygodnie)
- Sprint 1 (uczestnik): ankieta startowa; zadania bazowe + statusy + linki; listy zadań.
- Sprint 2 (mentor/konsultacje): dashboard mentora (overview); konsultacje + notatki + zadania dodatkowe.
- Sprint 3 (notyfikacje + historia): notifications + cron; `activity_log` + widok.
- Sprint 4 (raporty/UX): wskaźniki, filtry, CSV export (opcjonalnie).

## Kryteria Akceptacji (Przykładowe)
- Ankieta: zapis z timestamp; edycja do T+48h; mentor widzi read‑only.
- Zadania: status `done` ustawia `completed_at`; linki walidowane; zadania dodatkowe wyróżnione.
- Konsultacje: termin, notatki, zadania dodatkowe; powiązania działają.
- Notyfikacje: po przypisaniu zadania uczestnik widzi powiadomienie; `read_at` aktualizowane; przypomnienia wysyłane wg okien czasowych.
- Raporty: % ukończenia i ostatnia aktywność zgodne z danymi `task_status`/`activity_log`.

## Niefunkcjonalne
- Paginacja (20–50), indeksy (due_date/user_id/status), widoki materializowane.
- Audyt (activity_log), sensowne błędy, logowanie w API.
- i18n: pl‑PL (docelowo en).

## Ryzyka i Decyzje
- Preferuj RLS; dodatkowe sprawdzenia w API gdzie trzeba.
- Cron na Vercel: zadbać o idempotentność i okna czasowe.
- Start z linkami do plików, upload w późniejszym kroku.
- Mobile/PWA po MVP.

## Dalsze Kroki
- Migracje Supabase dla nowych tabel + indeksy.
- Endpoints /api (Sprint 1) + seedy.
- UI: ankieta startowa, listy zadań, dashboard mentora, konsultacje.
- Konfiguracja Vercel Cron dla przypomnień.
