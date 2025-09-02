'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import React from 'react'
import Pagination from '@/components/ui/Pagination'

interface User {
  id: string
  email: string
  role: string
  created_at: string
  is_active: boolean
}

interface SyncResult {
  success?: boolean
  message?: string
  error?: string
  results?: {
    total?: number
    created?: number
    updated?: number
    errors?: number
  }
}

export default function AdminUsers() {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  // Pagination state for users list
  const [usersPage, setUsersPage] = useState<number>(1)
  const [usersPageSize, setUsersPageSize] = useState<number>(20)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login')
      return
    }
    if (user.role !== 'superadmin') {
      router.push('/')
      return
    }
    fetchUsers()
  }, [isAuthenticated, user, router])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        // Filtruj użytkowników - wyklucz superadmina
        const filteredUsers = (data.users || []).filter((user: User) => user.role !== 'superadmin')
        setUsers(filteredUsers)
      }
    } catch (error) {
      console.error('Błąd podczas pobierania użytkowników:', error)
    } finally {
      setLoading(false)
    }
  }

  const syncWithWTL = async () => {
    try {
      setSyncing(true)
      setSyncResult(null)
      
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'sync-wtl' }),
      })
      
      if (response.ok) {
        const result: SyncResult = await response.json()
        setSyncResult(result)
        console.log('✅ Synchronizacja zakończona:', result)
        
        // Odśwież listę użytkowników
        await fetchUsers()
      } else {
        const error = await response.json()
        setSyncResult({ success: false, error: error.error || 'Błąd synchronizacji' })
        console.error('❌ Błąd synchronizacji:', error)
      }
    } catch (error) {
      console.error('❌ Błąd podczas synchronizacji:', error)
      setSyncResult({ success: false, error: 'Błąd połączenia' })
    } finally {
      setSyncing(false)
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (deleteConfirm !== userEmail) {
      setDeleteConfirm(null)
      return
    }

    try {
      setDeletingUser(userId)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const result: { message?: string } = await response.json()
        console.log('✅ Użytkownik usunięty:', result.message)
        
        // Odśwież listę użytkowników
        await fetchUsers()
        
        // Pokaż komunikat sukcesu
        setSyncResult({ success: true, message: result.message })
        setTimeout(() => setSyncResult(null), 5000)
      } else {
        const error = await response.json()
        setSyncResult({ success: false, error: error.error || 'Błąd usuwania użytkownika' })
        console.error('❌ Błąd usuwania użytkownika:', error)
      }
    } catch (error) {
      console.error('❌ Błąd podczas usuwania użytkownika:', error)
      setSyncResult({ success: false, error: 'Błąd połączenia' })
    } finally {
      setDeletingUser(null)
      setDeleteConfirm(null)
    }
  }

  const confirmDelete = (userId: string, userEmail: string) => {
    setDeleteConfirm(userEmail)
  }

  const cancelDelete = () => {
    setDeleteConfirm(null)
  }

  if (!isAuthenticated || !user || user.role !== 'superadmin') {
    return <div>Ładowanie...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Zarządzanie Użytkownikami</h1>
        <div className="flex gap-4">
          <button
            onClick={syncWithWTL}
            disabled={syncing}
            className={`px-4 py-2 rounded-lg font-medium ${
              syncing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {syncing ? '🔄 Synchronizuję...' : '🔄 Synchronizuj z WTL'}
          </button>
          <button
            onClick={() => router.push('/admin/users/add')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
          >
            ➕ Dodaj Użytkownika
          </button>
        </div>
      </div>

      {/* Wynik synchronizacji */}
      {syncResult && (
        <div className={`mb-6 p-4 rounded-lg ${
          syncResult.success 
            ? 'bg-green-100 border border-green-300 text-green-800' 
            : 'bg-red-100 border border-red-300 text-red-800'
        }`}>
          <h3 className="font-semibold mb-2">
            {syncResult.success ? '✅ Synchronizacja zakończona' : '❌ Błąd synchronizacji'}
          </h3>
          <p>{syncResult.message}</p>
          {syncResult.results && (
            <div className="mt-3 text-sm">
              <p><strong>Wyniki:</strong></p>
              <ul className="list-disc list-inside ml-4">
                <li>Łącznie: {syncResult.results.total}</li>
                <li>Utworzonych: {syncResult.results.created}</li>
                <li>Zaktualizowanych: {syncResult.results.updated}</li>
                <li>Błędów: {syncResult.results.errors}</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Lista użytkowników */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rola
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data utworzenia
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Ładowanie użytkowników...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Brak użytkowników
                </td>
              </tr>
            ) : (
              (() => { const start = (usersPage - 1) * usersPageSize; const pageSlice = users.slice(start, start + usersPageSize); return pageSlice })().map((user) => (
                <React.Fragment key={user.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'superadmin' 
                          ? 'bg-purple-100 text-purple-800'
                          : user.role === 'teacher'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Aktywny' : 'Nieaktywny'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('pl-PL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                          className="inline-flex items-center p-1 rounded text-indigo-600 hover:bg-indigo-50"
                          title="Edytuj"
                          aria-label="Edytuj"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path d="M17.414 2.586a2 2 0 00-2.828 0L6 11.172V14h2.828l8.586-8.586a2 2 0 000-2.828z"/><path fill-rule="evenodd" d="M4 16a2 2 0 002 2h8a2 2 0 002-2v-5a1 1 0 112 0v5a4 4 0 01-4 4H6a4 4 0 01-4-4V8a4 4 0 014-4h5a1 1 0 110 2H6a2 2 0 00-2 2v8z" clip-rule="evenodd"/></svg>
                        </button>
                        <button
                          onClick={() => confirmDelete(user.id, user.email)}
                          disabled={user.role === 'superadmin'}
                          className={`${
                            user.role === 'superadmin'
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-900'
                          }`}
                          title={user.role === 'superadmin' ? 'Nie można usunąć superadmina' : 'Usuń użytkownika'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 100 2h.293l.853 10.236A2 2 0 007.14 18h5.72a2 2 0 001.994-1.764L15.707 6H16a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0010 2H9zm1 5a1 1 0 00-1 1v7a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Potwierdzenie usunięcia */}
                  {deleteConfirm === user.email && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 bg-red-50">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-red-800">
                            <strong>Potwierdź usunięcie:</strong> Czy na pewno chcesz usunąć użytkownika <strong>{user.email}</strong>?
                            <br />
                            <span className="text-xs">Ta operacja jest nieodwracalna!</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              disabled={deletingUser === user.id}
                              className={`px-3 py-1 text-sm rounded ${
                                deletingUser === user.id
                                  ? 'bg-red-400 cursor-not-allowed'
                                  : 'bg-red-600 hover:bg-red-700 text-white'
                              }`}
                            >
                              {deletingUser === user.id ? 'Usuwanie...' : 'Tak, usuń'}
                            </button>
                            <button
                              onClick={cancelDelete}
                              className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded"
                            >
                              Anuluj
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
        <div className="px-6 py-4 border-t border-gray-200">
          <Pagination
            total={users.length}
            page={usersPage}
            pageSize={usersPageSize}
            onPageChange={(p) => setUsersPage(p)}
            onPageSizeChange={(s) => { setUsersPage(1); setUsersPageSize(s) }}
          />
        </div>
      </div>
      </div>
    </div>
  )
}




