export interface Note {
  id: string
  title: string
  content: string
  user_id: string
  created_at: string
  updated_at: string
  // Relacje
  lesson_connections?: NoteLessonConnection[]
  is_loose?: boolean
}

export interface NoteLessonConnection {
  id: string
  note_id: string
  lesson_id: string
  connection_type: 'primary' | 'related' | 'loose'
  created_at: string
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

export interface NoteWithConnections extends Note {
  lesson_connections: NoteLessonConnection[]
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
