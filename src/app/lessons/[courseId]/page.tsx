'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useParams } from 'next/navigation'

interface Lesson {
  id: string
  title: string
  description?: string
  content?: string
  order: number
  status: 'active' | 'inactive' | 'draft'
  created_at: string
  updated_at: string
  wtl_lesson_id?: string
  sync_status?: string
}

interface Course {
  id: string
  title: string
  description?: string
  status: string
}

interface LessonProgress {
  lesson_id: string
  student_id: string
  status: 'not_started' | 'in_progress' | 'completed'
  progress_percentage: number
  started_at?: string
  completed_at?: string
  last_activity?: string
}

export default function StudentLessonsPage() {
  const { user, isAuthenticated, initialize } = useAuthStore()
  const params = useParams()
  const courseId = params.courseId as string
  
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [course, setCourse] = useState<Course | null>(null)
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!user || !isAuthenticated) return

    // Sprawdź uprawnienia dostępu
    if (!hasAccess()) {
      setError('Brak uprawnień do przeglądania lekcji tego kursu')
      setIsLoading(false)
      return
    }

    fetchData()
  }, [user, isAuthenticated, courseId])

  const hasAccess = (): boolean => {
    if (!user) return false
    
    // Uczeń może przeglądać tylko swoje lekcje
    if (user.role === 'student') {
      // TODO: Sprawdzić czy student jest zapisany na ten kurs
      return true
    }
    
    // Nauczyciel może przeglądać lekcje swoich kursów
    if (user.role === 'teacher') {
      // TODO: Sprawdzić czy nauczyciel ma przypisany ten kurs
      return true
    }
    
    // Admin może wszystko
    if (user.role && user.role === 'superadmin') {
      return true
    }
    
    return false
  }

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Pobierz dane kursu
      const courseResponse = await fetch(`/api/courses/local/${courseId}`)
      if (!courseResponse.ok) throw new Error('Błąd pobierania danych kursu')
      const courseData = await courseResponse.json()
      setCourse(courseData.course)

      // Pobierz lekcje kursu
      const lessonsResponse = await fetch(`/api/lessons?courseId=${courseId}`)
      if (!lessonsResponse.ok) throw new Error('Błąd pobierania lekcji')
      const lessonsData = await lessonsResponse.json()
      setLessons(lessonsData.lessons || [])

      // Pobierz postęp studenta w lekcjach
      await fetchLessonProgress()

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLessonProgress = async () => {
    try {
      // TODO: Implementować API do pobierania postępu w lekcjach
      // Na razie używamy mock danych
      const mockProgress: LessonProgress[] = lessons.map(lesson => ({
        lesson_id: lesson.id,
        student_id: user?.id || '',
        status: Math.random() > 0.7 ? 'completed' : Math.random() > 0.5 ? 'in_progress' : 'not_started',
        progress_percentage: Math.floor(Math.random() * 100),
        started_at: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        completed_at: Math.random() > 0.7 ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        last_activity: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
      }))
      
      setLessonProgress(mockProgress)
    } catch (err) {
      console.error('Error fetching lesson progress:', err)
    }
  }

  const syncLessons = async () => {
    try {
      setIsSyncing(true)
      setError(null)

      const response = await fetch(`/api/lessons?courseId=${courseId}`, { method: 'GET' })
      if (!response.ok) throw new Error('Błąd synchronizacji lekcji')

      const result = await response.json()
      console.log('✅ Synchronizacja lekcji zakończona:', result)
      
      // Odśwież dane po synchronizacji
      await fetchData()
      
    } catch (err) {
      console.error('Error syncing lessons:', err)
      setError(err instanceof Error ? err.message : 'Błąd podczas synchronizacji')
    } finally {
      setIsSyncing(false)
    }
  }

  const getProgressStatus = (lessonId: string) => {
    const progress = lessonProgress.find(p => p.lesson_id === lessonId)
    return progress || {
      status: 'not_started',
      progress_percentage: 0,
      last_activity: undefined
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'not_started':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ukończona'
      case 'in_progress':
        return 'W trakcie'
      case 'not_started':
        return 'Nie rozpoczęta'
      default:
        return status
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600'
    if (progress >= 50) return 'text-yellow-600'
    return 'text-red-600'
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

  if (!hasAccess()) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Dostęp ograniczony</h2>
              <p className="mt-2 text-gray-600">Nie masz uprawnień do przeglądania lekcji tego kursu.</p>
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
                <h1 className="text-3xl font-bold text-gray-900">Moje lekcje</h1>
                <p className="mt-2 text-gray-600">
                  {course?.title}
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    📚 {lessons.length} lekcji
                  </div>
                  {user?.role === 'student' && (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      👨‍🎓 Twój postęp
                    </div>
                  )}
                </div>
              </div>
              
              <button style={{ display: 'none' }}
                onClick={syncLessons}
                disabled={isSyncing}
                className={`px-4 py-2 rounded-lg font-medium ${
                  isSyncing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                {isSyncing ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span>
                    Synchronizuję...
                  </>
                ) : (
                  '🔄 Synchronizuj lekcje'
                )}
              </button>
            </div>
          </div>

          {/* Lista lekcji */}
          {lessons.length > 0 ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Lista lekcji ({lessons.length})
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Twój postęp w nauce - dane zsynchronizowane z WTL API
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nr
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lekcja
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Postęp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ostatnia aktywność
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Akcje
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lessons.map((lesson, index) => {
                      const progress = getProgressStatus(lesson.id)
                      return (
                        <tr key={lesson.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {index + 1}
                          </td>
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
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(progress.status)}`}>
                              {getStatusLabel(progress.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className={`h-2 rounded-full ${getProgressColor(progress.progress_percentage)}`}
                                  style={{ width: `${progress.progress_percentage}%` }}
                                ></div>
                              </div>
                              <span className={`text-sm font-medium ${getProgressColor(progress.progress_percentage)}`}>
                                {progress.progress_percentage}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {progress.last_activity ? 
                              new Date(progress.last_activity).toLocaleDateString('pl-PL') :
                              'Brak aktywności'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => alert(`Otwieranie lekcji: ${lesson.title}`)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                              title="Otwórz lekcję"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Otwórz
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 5.477 5.754 5 7.5 5s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.523 18.246 19 16.5 19c-1.746 0-3.332-.477-4.5-1.253" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Brak lekcji</h3>
                <p className="text-sm text-gray-600">
                  Ten kurs nie ma jeszcze żadnych lekcji.
                </p>
                <button style={{ display: 'none' }}
                  onClick={syncLessons}
                  disabled={isSyncing}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  🔄 Synchronizuj lekcje z WTL
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
