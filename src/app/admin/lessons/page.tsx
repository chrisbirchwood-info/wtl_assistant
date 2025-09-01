'use client'

import { useState, useEffect } from 'react'
import Pagination from '@/components/ui/Pagination'
import { useAuthStore } from '@/store/auth-store'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

interface Lesson {
  id: string
  wtl_lesson_id: string
  course_id: string
  title: string
  description?: string
  content?: string
  order_number: number
  status: string
  created_at: string
  updated_at: string
  last_sync_at?: string
}

interface Course {
  id: string
  title: string
  wtl_course_id: string
}

export default function AdminLessonsPage() {
  const { user, isAuthenticated, initialize } = useAuthStore()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  // Pagination for lessons table
  const [listPage, setListPage] = useState<number>(1)
  const [listPageSize, setListPageSize] = useState<number>(20)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!user || !isAuthenticated) return
    
    // Sprawdź czy użytkownik ma uprawnienia superadmina
    if (user.role !== 'superadmin') {
      setError('Brak uprawnień do zarządzania lekcjami')
      return
    }
    
    fetchData()
  }, [user, isAuthenticated])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Pobierz lekcje
      const lessonsResponse = await fetch('/api/admin/lessons')
      if (!lessonsResponse.ok) throw new Error('Błąd pobierania lekcji')
      const lessonsData = await lessonsResponse.json()
      setLessons(lessonsData.lessons || [])

      // Pobierz kursy (do wyświetlania nazw)
      const coursesResponse = await fetch('/api/admin/courses')
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json()
        setCourses(coursesData.courses || [])
      }

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setIsLoading(false)
    }
  }

  const syncLessons = async () => {
    try {
      setIsSyncing(true)
      setError(null)

      const response = await fetch('/api/admin/lessons/sync', { method: 'POST' })
      if (!response.ok) throw new Error('Błąd synchronizacji lekcji')

      const result = await response.json()
      
      setSuccessMessage(`Lekcje zostały zsynchronizowane z WTL!\n\n` +
        `📚 Utworzono: ${result.lessons?.created || 0}\n` +
        `🔄 Zaktualizowano: ${result.lessons?.updated || 0}\n` +
        `❌ Błędy: ${result.lessons?.errors || 0}\n` +
        `📝 Szczegóły: ${result.errors?.length > 0 ? result.errors.join(', ') : 'Brak błędów'}`
      )
      
      // Odśwież dane
      await fetchData()
      
    } catch (err) {
      console.error('Error syncing lessons:', err)
      setError(err instanceof Error ? err.message : 'Błąd synchronizacji')
    } finally {
      setIsSyncing(false)
    }
  }

  const debugLessons = async () => {
    try {
      setIsSyncing(true)
      setError(null)

      // Debuguj pierwszy kurs (jeśli istnieje)
      if (courses.length === 0) {
        setError('Brak kursów do debugowania')
        return
      }

      const courseId = courses[0].id
      console.log('🔍 Debuguję synchronizację lekcji dla kursu:', courseId)

      const response = await fetch('/api/admin/lessons/debug', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      })
      
      if (!response.ok) throw new Error('Błąd debugowania')

      const result = await response.json()
      console.log('🔍 Wynik debugowania:', result)
      
      if (result.success) {
        const debugInfo = result.debug_info
        const recommendations = result.recommendations
        
        let debugMessage = `🔍 Debugowanie synchronizacji lekcji dla kursu: ${debugInfo.course.title}\n\n`
        debugMessage += `📊 WTL API:\n`
        debugMessage += `  • URL: ${debugInfo.wtl_api.base_url}\n`
        debugMessage += `  • Klucz API: ${debugInfo.wtl_api.has_api_key ? 'OK' : 'BRAK!'}\n`
        debugMessage += `  • Znaleziono lekcji: ${debugInfo.lessons_found}\n`
        debugMessage += `  • Zsynchronizowano: ${debugInfo.lessons_synced}\n\n`
        
        if (debugInfo.sample_lesson_fields) {
          debugMessage += `📝 Przykładowe pola lekcji:\n`
          debugMessage += `  • ID: ${debugInfo.sample_lesson_fields.id_field}\n`
          debugMessage += `  • Tytuł: ${debugInfo.sample_lesson_fields.title_field}\n`
          debugMessage += `  • Opis: ${debugInfo.sample_lesson_fields.description_field}\n`
          debugMessage += `  • Kolejność: ${debugInfo.sample_lesson_fields.order_field}\n\n`
        }
        
        if (recommendations.length > 0) {
          debugMessage += `💡 Zalecenia:\n`
          recommendations.forEach((rec: string) => {
            debugMessage += `  • ${rec}\n`
          })
        }
        
        setSuccessMessage(debugMessage)
      } else {
        setError('Błąd podczas debugowania')
      }
      
    } catch (err) {
      console.error('Error debugging lessons:', err)
      setError(err instanceof Error ? err.message : 'Błąd debugowania')
    } finally {
      setIsSyncing(false)
    }
  }

  const getCourseName = (courseId: string) => {
    const course = courses.find(c => c.id === courseId)
    return course?.title || `Kurs ${courseId.substring(0, 8)}...`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!user || user.role !== 'superadmin') {
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
                  <h3 className="text-sm font-medium text-red-800">Brak uprawnień</h3>
                  <div className="mt-2 text-sm text-red-700">
                    Tylko superadmin może zarządzać lekcjami.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center min-h-96">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
          </div>
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
                <h1 className="text-3xl font-bold text-gray-900">Zarządzanie lekcjami</h1>
                <p className="mt-2 text-gray-600">
                  Zarządzaj lekcjami w systemie - synchronizuj z WTL, przeglądaj i edytuj
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    📚 {lessons.length} lekcji w systemie
                  </div>
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    🎓 {courses.length} kursów dostępnych
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={syncLessons}
                  disabled={isSyncing}
                  className={`px-6 py-3 rounded-lg font-medium text-white ${
                    isSyncing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
                  }`}
                >
                  {isSyncing ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span>
                      Synchronizuję...
                    </>
                  ) : (
                    <>
                      🔄 Synchronizuj lekcje z WTL
                      <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">
                        ADMIN
                      </span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={debugLessons}
                  disabled={isSyncing}
                  className={`px-6 py-3 rounded-lg font-medium text-white ${
                    isSyncing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2'
                  }`}
                >
                  {isSyncing ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span>
                      Debuguję...
                    </>
                  ) : (
                    <>
                      🔍 Debuguj synchronizację
                      <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                        DEBUG
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Komunikat sukcesu */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-green-800 whitespace-pre-line">
                    {successMessage}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabela lekcji */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Lista wszystkich lekcji
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Szczegółowy widok wszystkich lekcji w systemie z możliwością filtrowania
              </p>
            </div>
            
            {lessons.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Brak lekcji</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Nie ma jeszcze żadnych lekcji w systemie.
                </p>
                <button
                  onClick={syncLessons}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                >
                  🔄 Synchronizuj z WTL
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lekcja
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kurs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        WTL ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ostatnia synchronizacja
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utworzono
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const start = (listPage - 1) * listPageSize
                      return lessons.slice(start, start + listPageSize)
                    })().map((lesson) => (
                      <tr key={lesson.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {lesson.title}
                            </div>
                            {lesson.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {lesson.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {getCourseName(lesson.course_id)}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {lesson.course_id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            lesson.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {lesson.status === 'active' ? 'Aktywna' : lesson.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {lesson.wtl_lesson_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lesson.last_sync_at ? formatDate(lesson.last_sync_at) : 'Nigdy'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(lesson.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-6 py-4 border-t border-gray-200">
                  <Pagination
                    total={lessons.length}
                    page={listPage}
                    pageSize={listPageSize}
                    onPageChange={(p) => setListPage(p)}
                    onPageSizeChange={(s) => { setListPage(1); setListPageSize(s) }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
