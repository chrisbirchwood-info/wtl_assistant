import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Typy dla tabel Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username?: string
          role: 'student' | 'teacher'
          wtl_user_id?: string
          wtl_last_sync?: string
          wtl_sync_status?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          username?: string
          role: 'student' | 'teacher'
          wtl_user_id?: string
          wtl_last_sync?: string
          wtl_sync_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          role?: 'student' | 'teacher'
          wtl_user_id?: string
          wtl_last_sync?: string
          wtl_sync_status?: string
          created_at?: string
          updated_at?: string
        }
      }
      teacher_profiles: {
        Row: {
          id: string
          user_id: string
          specialization?: string
          experience_years?: number
          bio?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          specialization?: string
          experience_years?: number
          bio?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          specialization?: string
          experience_years?: number
          bio?: string
          created_at?: string
          updated_at?: string
        }
      }
      student_profiles: {
        Row: {
          id: string
          user_id: string
          current_course_id?: string
          progress_percentage?: number
          enrollment_date?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          current_course_id?: string
          progress_percentage?: number
          enrollment_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          current_course_id?: string
          progress_percentage?: number
          enrollment_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_sync_log: {
        Row: {
          id: string
          user_id?: string
          wtl_user_id?: string
          sync_type: string
          sync_status: string
          user_role: 'student' | 'teacher'
          last_sync_at: string
          error_message?: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          wtl_user_id?: string
          sync_type: string
          sync_status: string
          user_role: 'student' | 'teacher'
          last_sync_at?: string
          error_message?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          wtl_user_id?: string
          sync_type?: string
          sync_status?: string
          user_role?: 'student' | 'teacher'
          last_sync_at?: string
          error_message?: string
          created_at?: string
        }
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          session_token: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_token: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_token?: string
          expires_at?: string
          created_at?: string
        }
      }
    }
  }
}

// Funkcje pomocnicze
export async function createUser(userData: { email: string; username?: string; role?: 'student' | 'teacher' }) {
  // Domyślnie ustaw rolę jako student jeśli nie podano
  const userDataWithRole = {
    ...userData,
    role: userData.role || 'student'
  }

  const { data, error } = await supabase
    .from('users')
    .insert([userDataWithRole])
    .select()
    .single()

  if (error) {
    console.error('Error creating user:', error)
    throw error
  }

  // Utwórz profil odpowiedni dla roli
  if (userDataWithRole.role === 'teacher') {
    await supabase
      .from('teacher_profiles')
      .insert([{ user_id: data.id }])
  } else {
    await supabase
      .from('student_profiles')
      .insert([{ user_id: data.id }])
  }

  return data
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    return null
  }

  return data
}

export async function saveUserSession(sessionData: {
  user_id: string
  session_token: string
  expires_at: string
}) {
  const { data, error } = await supabase
    .from('user_sessions')
    .insert([sessionData])
    .select()
    .single()

  if (error) {
    console.error('Error saving session:', error)
    throw error
  }

  return data
}

// Funkcje pomocnicze dla nowych typów użytkowników
export async function createUserWithRole(userData: { 
  email: string; 
  username?: string; 
  role: 'student' | 'teacher';
  wtl_user_id?: string;
}) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert([userData])
    .select()
    .single()

  if (userError) {
    console.error('Error creating user:', userError)
    throw userError
  }

  // Utwórz profil odpowiedni dla roli
  if (userData.role === 'teacher') {
    await supabase
      .from('teacher_profiles')
      .insert([{ user_id: user.id }])
  } else {
    await supabase
      .from('student_profiles')
      .insert([{ user_id: user.id }])
  }

  return user
}

export async function getUserWithProfile(email: string) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select(`
      *,
      teacher_profiles (*),
      student_profiles (*)
    `)
    .eq('email', email)
    .single()

  if (userError) {
    console.error('Error fetching user:', userError)
    return null
  }

  return user
}
