# Model Danych (docelowy + migracje)

## Założenia
- WTL dostarcza listę kursów i lekcji; brak relacji kurs↔lekcja – utrzymujemy ją lokalnie.
- Idempotentny upsert po `wtl_*_id` dla encji z WTL.
- Wielorole użytkownika (w miejsce pojedynczej kolumny `users.role`).
- Mapowanie lekcji do kursów w dedykowanej tabeli (więcej elastyczności niż `lessons.course_id`).

## Tabele (docelowo)

### users (istnieje)
- id: uuid pk
- email: varchar(255) unique
- username: varchar(255) null
- is_active: boolean default true
- wtl_user_id: varchar(255) null
- wtl_last_sync: timestamptz null
- wtl_sync_status: varchar(50) default 'pending'
- created_at, updated_at: timestamptz
- [tymczasowo] role: enum — do migracji na wielorole

### roles (nowa)
- code: varchar(50) pk (np. 'student', 'teacher', 'admin')
- name: varchar(100)

### user_roles (nowa)
- id: uuid pk
- user_id: uuid fk -> users(id)
- role_code: varchar(50) fk -> roles(code)
- unique(user_id, role_code)

Uwagi: kolumna `users.role` pozostaje czasowo dla zgodności UI/typów; docelowo UI przechodzi na `roles[]`.

### courses (istnieje)
- id: uuid pk
- wtl_course_id: varchar(255) unique
- title, description, status, max_students
- teacher_id: uuid (lead) — opcjonalnie
- last_sync_at, sync_status, created_at, updated_at

### course_teachers (istnieje)
- id: uuid pk
- course_id: uuid fk -> courses(id)
- teacher_id: uuid fk -> users(id)
- role: varchar(50) default 'teacher'
- assigned_by: uuid fk -> users(id) null
- assigned_at: timestamptz default now()
- is_active: boolean default true
- unique(course_id, teacher_id)

### lessons (istnieje)
- id: uuid pk
- wtl_lesson_id: varchar(255) unique not null
- title, description, content
- status: varchar(50) default 'active'
- order_number: int (historycznie)
- course_id: uuid fk -> courses(id) [do deprecjacji po wejściu course_lessons]
- last_sync_at, created_at, updated_at

### course_lessons (nowa)
- id: uuid pk
- course_id: uuid fk -> courses(id)
- lesson_id: uuid fk -> lessons(id)
- position: int not null
- required: boolean default false
- unique(course_id, lesson_id)
- index(course_id, position)

Cel: lokalne przypinanie lekcji (dowolnej) do kursu, różna kolejność dla różnych kursów, tag „wymagana”.

### course_enrollments (istnieje)
- id: uuid pk
- course_id: uuid
- student_id: uuid
- status: varchar(50) default 'enrolled'
- progress_percentage, last_activity
- created_at, updated_at

### notes (istnieje — rozszerzenie)
- id: uuid pk
- user_id: uuid (właściciel – student)
- author_id: uuid (nowe – kto dodał notatkę; typowo nauczyciel)
- course_id: uuid (nowe – kontekst kursu)
- title: varchar(255)
- content: text
- created_at, updated_at

RLS: odczyt student, nauczyciel przypisany do kursu, admin; zapis przez service-role API.

### note_lesson_connections (istnieje — dostosowanie)
- id: uuid pk
- note_id: uuid fk -> notes(id)
- lesson_id: uuid (ID WTL lub lokalny – rekomendacja: przejść na fk do lessons.id w kolejnym kroku)
- connection_type: enum('primary','related','loose') default 'related'
- unique(note_id, lesson_id)

### sync_log (istnieje)
- id: uuid pk
- entity_type: varchar(50)
- entity_id: uuid
- action: varchar(50)
- details: jsonb
- created_at: timestamptz

## Migracje (plan)
1) Wielorole:
   - Utworzyć `roles`, `user_roles` i zapełnić rolami domyślnymi (student, teacher, admin).
   - Migrować `users.role` → `user_roles` (dla każdego usera jedna pozycja).
   - UI i API przełączane sukcesywnie na `roles[]`; pozostawić `users.role` do czasu pełnej migracji.
2) Mapowanie lekcji:
   - Utworzyć `course_lessons`.
   - Nowe API i UI admin do przypinania/reorder (drag&drop).
   - Po wdrożeniu przepiąć widoki konsumenckie na `course_lessons` (wyłączyć zależność od `lessons.course_id`).
3) Notatki:
   - Dodać kolumny `author_id`, `course_id` w `notes`.
   - Dostosować polityki RLS; zapisy wykonywać przez service role.

## Indeksy i spójność
- `user_roles`: unique(user_id, role_code)
- `course_lessons`: index(course_id, position), unique(course_id, lesson_id)
- `lessons`: idx wtl_lesson_id, status, (docelowo bez course_id)
- Transakcje na batchach sync; logi w `sync_log`.
