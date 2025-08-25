'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
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
  }, [isAuthenticated, isLoading, router])
  
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
  
  return <>{children}</>
}

