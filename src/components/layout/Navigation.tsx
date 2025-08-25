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
    // Inicjalizuj stan autoryzacji przy pierwszym renderowaniu
    initialize()
  }, [initialize])
  
  if (!user || !isAuthenticated) return null
  
  // Debug: sprawdź rolę użytkownika
  console.log('Navigation - User role:', user.role, 'User data:', user)
  
  const navigation = [
    { name: 'Dashboard', href: '/wtl', current: pathname === '/wtl' },
    { name: 'Mój profil', href: '/profile', current: pathname === '/profile' },
  ]

  // Dodaj link do zarządzania studentami TYLKO dla nauczycieli
  // Dodatkowe sprawdzenie czy rola jest zdefiniowana i równa 'teacher'
  // Dodatkowe zabezpieczenie: upewnij się, że rola jest rzeczywiście 'teacher' w bazie
  if (user.role && user.role === 'teacher') {
    console.log('🔒 Navigation: User has teacher role, showing "Moi studenci" link')
    navigation.push({ 
      name: 'Moi studenci', 
      href: '/teacher/students', 
      current: pathname === '/teacher/students' 
    })
  } else {
    console.log('🔒 Navigation: User does NOT have teacher role, hiding "Moi studenci" link')
    console.log('🔒 Navigation: User role is:', user.role)
  }

  // Dodaj link do panelu admina TYLKO dla superadminów
  if (user.role && user.role === 'superadmin') {
    console.log('🔒 Navigation: User has superadmin role, showing "Panel Admina" link')
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
