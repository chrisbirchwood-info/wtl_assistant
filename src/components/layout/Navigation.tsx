'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import UserMenu from '@/components/auth/UserMenu'
import { useAuthStore } from '@/store/auth-store'

export default function Navigation() {
  const pathname = usePathname()
  const { user, isAuthenticated, initialize } = useAuthStore()

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
          <div className="flex">
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

          <div className="flex items-center">
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  )
}

