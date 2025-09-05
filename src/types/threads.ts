export * from './thread-core'

// Alias names for "threads" terminology while keeping DB field names intact.
import type {
  Note,
  NoteWithConnections,
  NoteLessonConnection,
  NoteSurveyConnection,
  CreateNoteRequest,
  UpdateNoteRequest,
  LinkThreadToSurveyRequest,
  SyncSurveyConnectionsResponse,
  SurveyResponse,
  SurveyForm,
  SurveyAnswer,
  ThreadSurveyData,
  Lesson,
} from './thread-core'

export type Thread = Note
export type ThreadWithConnections = NoteWithConnections
export type ThreadLessonConnection = NoteLessonConnection
export type ThreadSurveyConnection = NoteSurveyConnection
export type CreateThreadRequest = CreateNoteRequest
export type UpdateThreadRequest = UpdateNoteRequest
export type { 
  LinkThreadToSurveyRequest,
  SyncSurveyConnectionsResponse,
  SurveyResponse,
  SurveyForm,
  SurveyAnswer,
  ThreadSurveyData,
  Lesson 
}
