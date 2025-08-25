'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { useRouter } from 'next/navigation'

export default function UserMenu() {
  const { user, isAuthenticated, logout, initialize } = useAuthStore()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  
  useEffect(() => {
    // Inicjalizuj stan autoryzacji przy pierwszym renderowaniu
    initialize()
  }, [initialize])
  
  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }
  
  if (!user || !isAuthenticated) return null
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user.username ? user.username.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
        </div>
        <span className="hidden md:block">
          {user.username || user.email}
        </span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
          <div className="px-4 py-2 text-sm text-gray-700 border-b">
            <p className="font-medium">{user.username || 'Użytkownik'}</p>
            <p className="text-gray-500">{user.email}</p>
          </div>
          
          <a
            href="/profile"
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
          >
            Mój profil
          </a>
          
          {/* Link do zarządzania studentami dla nauczycieli */}
          {user.role === 'teacher' && (
            <a
              href="/teacher/students"
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
            >
              Moi studenci
            </a>
          )}
          
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
          >
            Wyloguj się
          </button>
        </div>
      )}
    </div>
  )
}

