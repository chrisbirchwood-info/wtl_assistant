'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'

interface User {
  id: string
  email: string
  username?: string
  role: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export default function EditUser() {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [userData, setUserData] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    role: 'student',
    is_active: true
  })

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login')
      return
    }
    if (user.role !== 'superadmin') {
      router.push('/')
      return
    }
    fetchUser()
  }, [isAuthenticated, user, router, userId])

  const fetchUser = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUserData(data.user)
        setFormData({
          email: data.user.email || '',
          username: data.user.username || '',
          role: data.user.role || 'student',
          is_active: data.user.is_active !== undefined ? data.user.is_active : true
        })
      } else {
        setError('Nie udało się pobrać danych użytkownika')
      }
    } catch (error) {
      console.error('Błąd podczas pobierania użytkownika:', error)
      setError('Wystąpił błąd podczas pobierania danych')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const result = await response.json()
        setSuccess(result.message || 'Użytkownik został zaktualizowany pomyślnie')
        setUserData(result.user)
        
        // Automatycznie ukryj komunikat sukcesu po 3 sekundach
        setTimeout(() => {
          setSuccess(null)
        }, 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Wystąpił błąd podczas aktualizacji')
      }
    } catch (error) {
      console.error('Błąd podczas aktualizacji użytkownika:', error)
      setError('Wystąpił błąd podczas aktualizacji')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/admin/users')
  }

  if (!isAuthenticated || !user || user.role !== 'superadmin') {
    return <div>Ładowanie...</div>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Użytkownik nie został znaleziony</h2>
          <button
            onClick={() => router.push('/admin/users')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Wróć do listy użytkowników
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Nagłówek */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edytuj Użytkownika</h1>
              <p className="mt-2 text-gray-600">
                Edytuj dane użytkownika: {userData.email}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Anuluj
            </button>
          </div>
        </div>

        {/* Komunikaty */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Błąd</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Sukces</h3>
                <div className="mt-2 text-sm text-green-700">{success}</div>
              </div>
            </div>
          </div>
        )}

        {/* Formularz */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="user@example.com"
              />
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Nazwa użytkownika
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nazwa użytkownika"
              />
            </div>

            {/* Rola */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Rola *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="student">Student</option>
                <option value="teacher">Nauczyciel</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>

            {/* Status aktywny */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Użytkownik aktywny
              </label>
            </div>

            {/* Informacje o użytkowniku */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Informacje systemowe</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">ID:</span> {userData.id}
                </div>
                <div>
                  <span className="font-medium">Utworzony:</span> {new Date(userData.created_at).toLocaleDateString('pl-PL')}
                </div>
                {userData.updated_at && (
                  <div>
                    <span className="font-medium">Ostatnia aktualizacja:</span> {new Date(userData.updated_at).toLocaleDateString('pl-PL')}
                  </div>
                )}
              </div>
            </div>

            {/* Przyciski */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  saving
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
