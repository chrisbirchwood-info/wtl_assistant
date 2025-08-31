'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import CreateNoteForm from '@/components/notes/CreateNoteForm'
import NotesList from '@/components/notes/NotesList'
import { NoteWithConnections, Lesson } from '@/types/notes'

export default function NotesPage() {
  const { user, isAuthenticated, initialize } = useAuthStore()
  const [notes, setNotes] = useState<NoteWithConnections[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!user || !isAuthenticated) return
    
    fetchData()
  }, [user, isAuthenticated])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Pobierz notatki z powiązaniami
      const notesResponse = await fetch('/api/notes?include_connections=true')
      if (!notesResponse.ok) throw new Error('Błąd pobierania notatek')
      const notesData = await notesResponse.json()
      setNotes(notesData.notes || [])

      // Pobierz wszystkie lekcje z bazy danych
      try {
        const lessonsResponse = await fetch('/api/lessons')
        if (lessonsResponse.ok) {
          const lessonsData = await lessonsResponse.json()
          setLessons(lessonsData.lessons || [])
        }
      } catch (err) {
        console.log('Błąd pobierania lekcji, używam pustej listy')
        setLessons([])
      }

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNoteCreated = () => {
    fetchData()
  }

  const handleNoteUpdated = () => {
    fetchData()
  }

  const handleNoteDeleted = () => {
    fetchData()
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Nagłówek */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Moje notatki</h1>
                <p className="mt-2 text-gray-600">
                  Zarządzaj swoimi notatkami - luźnymi lub powiązanymi z lekcjami
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    📝 {notes.length} notatek
                  </div>
                  {lessons.length > 0 && (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      📚 {lessons.length} lekcji dostępnych
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {showCreateForm ? 'Ukryj formularz' : '➕ Nowa notatka'}
              </button>
            </div>
          </div>

          {/* Formularz tworzenia notatki */}
                     {showCreateForm && (
             <div className="mb-8">
                                <CreateNoteForm
                   onNoteCreated={handleNoteCreated}
                   lessons={lessons}
                   user={user || undefined}
                 />
             </div>
           )}

          {/* Lista notatek */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Twoje notatki
            </h2>
                                      <NotesList
                 notes={notes}
                 lessons={lessons}
                 onNoteUpdated={handleNoteUpdated}
                 onNoteDeleted={handleNoteDeleted}
                 user={user || undefined}
               />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
