'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading, initialize } = useAuthStore()
  const router = useRouter()
  
  useEffect(() => {
    // Inicjalizuj stan autoryzacji przy pierwszym renderowaniu
    initialize()
  }, [initialize])
  
  useEffect(() => {
    console.log('🔒 ProtectedRoute - Auth state:', { isAuthenticated, isLoading, user: !!user })
    if (!isLoading && !isAuthenticated) {
      console.log('🚫 Access denied, redirecting to login')
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router, user])
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Sprawdzanie autoryzacji...</p>
        </div>
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return null
  }
  
  // Sprawdź czy użytkownik ma odpowiednią rolę
  if (allowedRoles && user && user.role && !allowedRoles.includes(user.role)) {
    console.log('🚫 Role access denied:', { userRole: user.role, allowedRoles })
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Dostęp zabroniony</h1>
          <p className="text-gray-600 mb-4">
            Twoja rola ({user.role}) nie ma dostępu do tej strony.
          </p>
          <p className="text-sm text-gray-500">
            Wymagane role: {allowedRoles.join(', ')}
          </p>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}
