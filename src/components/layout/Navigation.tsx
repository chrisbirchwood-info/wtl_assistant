'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import UserMenu from '@/components/auth/UserMenu'
import { useAuthStore } from '@/store/auth-store'

export default function Navigation() {
  const pathname = usePathname()
  const { user, isAuthenticated, initialize } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    initialize()
  }, [initialize])

  if (!user || !isAuthenticated) return null

  const navigation = [
    { name: 'Dashboard', href: '/wtl', current: pathname === '/wtl' },
    { name: 'Mój profil', href: '/profile', current: pathname === '/profile' },
  ]

  // Link do lekcji tylko dla studentów
  if (user.role && user.role === 'student') {
    navigation.push({
      name: 'Moje lekcje',
      href: '/wtl', // Dashboard z wyborem kursu
      current: pathname.startsWith('/lessons')
    })
  }

  // Wątki (threads) dla wszystkich zalogowanych użytkowników
  navigation.push({
    name: '🧵 Wątki',
    href: '/threads',
    current: pathname === '/threads'
  })

  // Link do zarządzania studentami tylko dla nauczycieli
  if (user.role && user.role === 'teacher') {
    navigation.push({
      name: 'Moi studenci',
      href: `/teacher/${user.id}/students`,
      current: pathname.startsWith('/teacher/') && pathname.includes('/students')
    })
    navigation.push({
      name: 'Ankiety',
      href: `/teacher/${user.id}/surveys`,
      current: pathname.startsWith('/teacher/') && pathname.includes('/surveys')
    })
    navigation.push({
      name: 'Wątki z ankiet',
      href: `/teacher/${user.id}/survey-threads`,
      current: pathname.startsWith('/teacher/') && pathname.includes('/survey-threads')
    })
  }

  // Link do panelu admina tylko dla superadminów
  if (user.role && user.role === 'superadmin') {
    navigation.push({
      name: 'Panel Admina',
      href: '/admin',
      current: pathname === '/admin'
    })
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/wtl" className="text-xl font-bold text-blue-600">
                WTL Assistant
              </Link>
            </div>

            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    item.current
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Otwórz menu"
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  item.current
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
