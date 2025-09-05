export interface Note {
  id: string
  title: string
  content: string
  user_id: string
  created_at: string
  updated_at: string
  // Relacje
  lesson_connections?: NoteLessonConnection[]
  survey_connections?: NoteSurveyConnection[]
  is_loose?: boolean
}

export interface NoteLessonConnection {
  id: string
  note_id: string
  lesson_id: string
  connection_type: 'primary' | 'related' | 'loose'
  created_at: string
}

export interface NoteSurveyConnection {
  id: string
  thread_id: string
  form_id: string
  survey_response_id?: string
  connection_type: 'waiting' | 'responded' | 'manual'
  created_at: string
  created_by?: string
  synced_at?: string
}

export interface SurveyResponse {
  id: string
  response_id: string
  form_id: string
  respondent_email?: string
  submitted_at?: string
  created_at: string
  updated_at: string
}

export interface SurveyForm {
  form_id: string
  teacher_id: string
  title?: string
  description?: string
  questions?: any
  created_at: string
  updated_at: string
  last_synced_at?: string
  total_responses: number
}

export interface SurveyAnswer {
  id: string
  response_id: string
  question_id: string
  question_text?: string
  question_type?: string
  answer_text?: string
  answer_value?: any
  created_at: string
}

export interface ThreadSurveyData {
  connection_id: string
  form_id: string
  form_title?: string
  connection_type: 'waiting' | 'responded' | 'manual'
  created_at: string
  synced_at?: string
  response_id?: string
  respondent_email?: string
  submitted_at?: string
  answers?: SurveyAnswer[]
}

export interface CreateNoteRequest {
  title: string
  content: string
  lesson_ids?: string[]
  connection_types?: ('primary' | 'related' | 'loose')[]
}

export interface UpdateNoteRequest {
  title?: string
  content?: string
  lesson_ids?: string[]
  connection_types?: ('primary' | 'related' | 'loose')[]
}

export interface LinkThreadToSurveyRequest {
  thread_id: string
  form_id: string
  teacher_id: string
}

export interface SyncSurveyConnectionsResponse {
  updated_connections: number
}

export interface NoteWithConnections extends Note {
  lesson_connections: NoteLessonConnection[]
  survey_connections?: NoteSurveyConnection[]
  survey_data?: ThreadSurveyData
}

export interface Lesson {
  id: string
  title: string
  description?: string
  content?: string
  order_number?: number
  order?: number // dla kompatybilności wstecznej
  status: 'active' | 'inactive' | 'draft'
  created_at: string
  updated_at: string
  wtl_lesson_id?: string
  sync_status?: string
}

