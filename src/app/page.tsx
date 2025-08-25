'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, initialize } = useAuthStore()
  
  useEffect(() => {
    // Inicjalizuj stan autoryzacji przy pierwszym renderowaniu
    initialize()
  }, [initialize])
  
  useEffect(() => {
    console.log('🏠 HomePage - Auth state:', { isAuthenticated, isLoading })
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/wtl')
      } else {
        router.push('/auth/login')
      }
    }
  }, [isAuthenticated, isLoading, router])
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Ładowanie...</p>
        </div>
      </div>
    )
  }
  
  return null
}