export interface ThreadChecklistItem {
  id: string
  checklist_id: string
  label: string
  position?: number
  checked?: boolean
  created_at?: string
}

export interface ThreadChecklist {
  id: string
  thread_id: string
  due_at?: string | null
  status?: 'todo' | 'in_progress' | 'done'
  visibility?: 'public' | 'private'
  created_by?: string | null
  created_at: string
  updated_at: string
  items?: ThreadChecklistItem[]
}

export interface CreateThreadChecklistRequest {
  due_at?: string | null
  visibility?: 'public' | 'private'
  items: { label: string; position?: number }[]
  status?: 'todo' | 'in_progress' | 'done'
}

export interface UpdateThreadChecklistRequest {
  due_at?: string | null
  visibility?: 'public' | 'private'
  status?: 'todo' | 'in_progress' | 'done'
}
