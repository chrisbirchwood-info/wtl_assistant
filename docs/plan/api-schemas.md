# API Schemas — JSON (request/response)

Uwaga: to są schematy referencyjne. Wdrożenie powinno trzymać strukturę sukcesu `{ success: true, ... }` i błędu `{ success: false, message, error? }` lub `{ error, details? }` w istniejącym stylu.

## Admin — Teachers

GET `/api/admin/teachers`
- Query: `?active=true|false` (opcjonalnie)
- 200 OK
```json
{
  "success": true,
  "teachers": [
    {
      "id": "uuid",
      "email": "string",
      "username": "string|null",
      "first_name": "string|null",
      "last_name": "string|null",
      "is_active": true,
      "created_at": "2025-08-31T12:34:56.000Z"
    }
  ]
}
```

## Admin — Course Teachers

GET `/api/admin/courses/{courseId}/teachers`
```json
{ "success": true, "teachers": [
  {
    "id": "uuid",               // course_teachers.id
    "course_id": "uuid",
    "teacher_id": "uuid",
    "role": "teacher|assistant",
    "assigned_at": "ISO",
    "is_active": true,
    "teacher": {
      "id": "uuid", "email": "string", "username": "string|null",
      "first_name": "string|null", "last_name": "string|null"
    },
    "assigned_by_user": { "id": "uuid", "email": "string" }
  }
]}
```

POST `/api/admin/courses/{courseId}/teachers`
```json
{ "teacherId": "uuid", "role": "teacher", "assignedBy": "uuid" }
```
- 200 OK
```json
{ "success": true, "message": "Nauczyciel został przypisany do kursu", "assignment": { /* jak w GET */ } }
```

DELETE `/api/admin/courses/{courseId}/teachers`
```json
{ "teacherId": "uuid" }
```
- 200 OK `{ "success": true }`

## Admin — Course Lessons (mapowanie lokalne)

GET `/api/admin/courses/{courseId}/lessons`
```json
{
  "success": true,
  "items": [
    {
      "lesson_id": "uuid",       // lokalne lessons.id
      "wtl_lesson_id": "string",
      "title": "string",
      "position": 1,
      "required": false
    }
  ]
}
```

POST `/api/admin/courses/{courseId}/lessons`
```json
{ "lesson_id": "uuid" }
```
- 200 OK
```json
{ "success": true, "item": { "lesson_id": "uuid", "position": 7, "required": false } }
```

PATCH `/api/admin/courses/{courseId}/lessons/reorder`
```json
{ "items": [ { "lesson_id": "uuid", "position": 1 }, { "lesson_id": "uuid", "position": 2 } ] }
```
- 200 OK `{ "success": true }`

DELETE `/api/admin/courses/{courseId}/lessons/{lessonId}`
- 200 OK `{ "success": true }`

## Admin — Users (wielorole)

POST `/api/admin/users`
```json
{ "email": "user@example.com", "password": "plaintext-or-temporary", "roles": ["student", "teacher"], "username": "string", "is_active": true }
```
- 201 Created
```json
{ "success": true, "user": { "id": "uuid", "email": "...", "roles": ["student", "teacher"] } }
```

PATCH `/api/admin/users`
```json
{ "id": "uuid", "email": "new@example.com", "username": "newname", "is_active": true, "roles": ["teacher", "admin"] }
```
- 200 OK `{ "success": true, "user": { /* updated */ } }`

## Admin — Lessons (sync)

POST `/api/admin/lessons/sync`
- 200 OK
```json
{ "success": true, "lessons": { "created": 10, "updated": 25, "errors": 0 }, "errors": [] }
```

## Teacher — Notes

POST `/api/teacher/notes`
```json
{ "student_id": "uuid", "course_id": "uuid", "lesson_id": "uuid(optional)", "content": "tekst notatki" }
```
- 201 Created
```json
{ "success": true, "note": { "id": "uuid", "user_id": "student_id", "author_id": "teacher_id", "course_id": "uuid", "created_at": "ISO", "content": "..." } }
```

## Notatki — przegląd

GET `/api/notes?student_id=&course_id=&lesson_id=&include_connections=true|false`
- 200 OK
```json
{ "success": true, "notes": [ { "id": "uuid", "title": "...", "content": "...", "note_lesson_connections": [ { "lesson_id": "uuid", "connection_type": "related" } ] } ] }
```
