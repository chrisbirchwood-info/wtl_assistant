import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserSession } from '@/lib/auth'

interface AuthState {
  user: UserSession | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  setUser: (user: UserSession | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  login: (user: UserSession) => void
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user,
        error: null 
      }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      login: (user) => set({ 
        user, 
        isAuthenticated: true,
        error: null 
      }),
      
      logout: () => set({ 
        user: null, 
        isAuthenticated: false,
        error: null 
      }),
      
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
)

