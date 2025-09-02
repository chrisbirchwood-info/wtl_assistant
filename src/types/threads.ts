export * from './thread-core'

// Alias names for "threads" terminology while keeping DB field names intact.
import type {
  Note,
  NoteWithConnections,
  NoteLessonConnection,
  CreateNoteRequest,
  UpdateNoteRequest,
  Lesson,
} from './thread-core'

export type Thread = Note
export type ThreadWithConnections = NoteWithConnections
export type ThreadLessonConnection = NoteLessonConnection
export type CreateThreadRequest = CreateNoteRequest
export type UpdateThreadRequest = UpdateNoteRequest
export type { Lesson }
