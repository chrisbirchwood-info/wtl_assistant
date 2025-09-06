export interface ThreadNote {
  id: string
  thread_id: string
  content_html: string
  created_by?: string | null
  created_at: string
  updated_at: string
  visibility?: 'public' | 'private'
}

export interface CreateThreadNoteRequest {
  content_html: string
}

export interface UpdateThreadNoteRequest {
  content_html: string
}
