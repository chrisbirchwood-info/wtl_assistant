export interface ThreadTask {
  id: string
  thread_id: string
  content_html: string
  due_at?: string | null
  status: 'todo' | 'in_progress' | 'done'
  visibility?: 'public' | 'private'
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface CreateThreadTaskRequest {
  content_html: string
  due_at?: string | null
  status?: 'todo' | 'in_progress' | 'done'
  visibility?: 'public' | 'private'
}

export interface UpdateThreadTaskRequest {
  content_html?: string | null
  due_at?: string | null
  status?: 'todo' | 'in_progress' | 'done'
  visibility?: 'public' | 'private'
}

