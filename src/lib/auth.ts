import jwt from 'jsonwebtoken'

// Konfiguracja
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const HARDCODED_OTP = '555555'

export interface UserSession {
  id: string
  email: string
  username?: string
  role?: 'student' | 'teacher'
  wtl_user_id?: string
  wtl_last_sync?: string
  wtl_sync_status?: string
  created_at?: string
  updated_at?: string
  iat: number
  exp: number
}

/**
 * Weryfikuje OTP
 */
export function verifyOTP(otp: string): boolean {
  return otp === HARDCODED_OTP
}

/**
 * Generuje JWT token sesji użytkownika
 */
export function generateUserSession(user: { 
  id: string; 
  email: string; 
  username?: string;
  role?: 'student' | 'teacher';
  wtl_user_id?: string;
  wtl_last_sync?: string;
  wtl_sync_status?: string;
  created_at?: string;
  updated_at?: string;
}): string {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      username: user.username,
      role: user.role,
      wtl_user_id: user.wtl_user_id,
      wtl_last_sync: user.wtl_last_sync,
      wtl_sync_status: user.wtl_sync_status,
      created_at: user.created_at,
      updated_at: user.updated_at
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

/**
 * Weryfikuje JWT token sesji użytkownika
 */
export function verifyUserSession(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession
  } catch (error) {
    console.error('Session verification failed:', error)
    return null
  }
}

