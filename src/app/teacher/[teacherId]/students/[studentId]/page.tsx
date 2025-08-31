'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useParams, useSearchParams } from 'next/navigation'
import CreateNoteForm from '@/components/notes/CreateNoteForm'
import NotesList from '@/components/notes/NotesList'
import { NoteWithConnections, Lesson as NoteLesson } from '@/types/notes'

interface Lesson {
  id: string
  title: string
  description?: string
  content?: string
  order_number?: number
  order?: number // dla kompatybilności wstecznej
  status: 'active' | 'inactive' | 'draft'
  created_at: string
  updated_at: string
  wtl_lesson_id?: string
  sync_status?: string
}

interface Student {
  id: string
  email: string
  username?: string
  first_name?: string
  last_name?: string
  status: string
  created_at: string
  updated_at: string
  last_sync_at?: string
  sync_status?: string
  wtl_student_id?: string
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
  const searchParams = useSearchParams()
  const teacherId = params.teacherId as string
  const studentId = params.studentId as string
  const courseId = searchParams.get('courseId')
  
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [student, setStudent] = useState<Student | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([])
  const [notes, setNotes] = useState<NoteWithConnections[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreateNoteForm, setShowCreateNoteForm] = useState(false)
  const [selectedLessonForNote, setSelectedLessonForNote] = useState<string | null>(null)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!user || !isAuthenticated || !courseId) return

    // Sprawdź uprawnienia dostępu
    if (!hasAccess()) {
      setError('Brak uprawnień do przeglądania lekcji tego studenta')
      setIsLoading(false)
      return
    }

    fetchData()
  }, [user, isAuthenticated, courseId, studentId, teacherId])

  const hasAccess = (): boolean => {
    if (!user) return false
    
    // Uczeń może przeglądać tylko swoje lekcje
    if (user.role === 'student') {
      return user.id === studentId
    }
    
    // Nauczyciel może przeglądać lekcje swoich studentów
    if (user.role === 'teacher') {
      // Sprawdź czy nauczyciel przegląda swoje dane
      return user.id === teacherId
    }
    
    // Superadmin może wszystko
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

             // Pobierz dane studenta
       const studentResponse = await fetch(`/api/teacher/students/${studentId}`)
       if (!studentResponse.ok) throw new Error('Błąd pobierania danych studenta')
       const studentData = await studentResponse.json()
       setStudent(studentData.user)

             // Pobierz lekcje kursu z bazy danych
       const lessonsResponse = await fetch(`/api/lessons?courseId=${courseId}`)
       if (!lessonsResponse.ok) throw new Error('Błąd pobierania lekcji')
       const lessonsData = await lessonsResponse.json()
       setLessons(lessonsData.lessons || [])

      // Pobierz postęp studenta w lekcjach
      await fetchLessonProgress()

      // Pobierz notatki dla tego kursu
      await fetchNotes()

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchNotes = async () => {
    try {
      // Pobierz notatki powiązane z lekcjami tego kursu
      const notesResponse = await fetch('/api/notes?include_connections=true')
      if (notesResponse.ok) {
        const notesData = await notesResponse.json()
        // Filtruj notatki, które są powiązane z lekcjami tego kursu
        const courseNotes = notesData.notes?.filter((note: NoteWithConnections) => 
          note.lesson_connections?.some(conn => 
            lessons.some(lesson => lesson.id === conn.lesson_id)
          )
        ) || []
        setNotes(courseNotes)
      }
    } catch (err) {
      console.log('Błąd pobierania notatek:', err)
    }
  }

  const fetchLessonProgress = async () => {
    try {
      // TODO: Implementować API do pobierania postępu w lekcjach
      // Na razie używamy mock danych
      const mockProgress: LessonProgress[] = lessons.map(lesson => ({
        lesson_id: lesson.id,
        student_id: studentId,
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

  const handleNoteCreated = () => {
    fetchNotes()
  }

  const handleNoteUpdated = () => {
    fetchNotes()
  }

  const handleNoteDeleted = () => {
    fetchNotes()
  }

  const openCreateNoteForm = (lessonId?: string) => {
    setSelectedLessonForNote(lessonId || null)
    setShowCreateNoteForm(true)
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
              <p className="mt-2 text-gray-600">Nie masz uprawnień do przeglądania lekcji tego studenta.</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!courseId) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Brak informacji o kursie</h2>
              <p className="mt-2 text-gray-600">Nie podano ID kursu w parametrach URL.</p>
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
                <h1 className="text-3xl font-bold text-gray-900">Lekcje studenta</h1>
                <p className="mt-2 text-gray-600">
                  {course?.title} - {student?.username || student?.email}
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    📚 {lessons.length} lekcji
                  </div>
                  {user?.role === 'teacher' && (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      👨‍🏫 Widok nauczyciela
                    </div>
                  )}
                  {user?.role === 'student' && (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      👨‍🎓 Twój postęp
                    </div>
                  )}
                </div>
              </div>
              
                             <div className="text-sm text-gray-600">
                 <p>Lekcje są synchronizowane automatycznie</p>
                 <p>wraz z kursami w panelu &quot;Zarządzanie kursami&quot;</p>
               </div>
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
                  Postęp w nauce - dane zsynchronizowane z WTL API
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
                            <div className="flex space-x-2">
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
                              <button
                                onClick={() => openCreateNoteForm(lesson.id)}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                                title="Dodaj notatkę do tej lekcji"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Notatka
                              </button>
                            </div>
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
                                 <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                   <p className="text-sm text-blue-800">
                     💡 <strong>Lekcje są synchronizowane automatycznie</strong>
                   </p>
                   <p className="text-sm text-blue-700 mt-1">
                     Użyj przycisku &quot;🔄 Synchronizuj kursy z WTL&quot; w panelu &quot;Zarządzanie kursami&quot;
                   </p>
                 </div>
              </div>
            </div>
          )}

          {/* Sekcja notatek */}
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      📝 Notatki do lekcji ({notes.length})
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Notatki powiązane z lekcjami tego kursu
                    </p>
                  </div>
                  <button
                    onClick={() => openCreateNoteForm()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    ➕ Nowa notatka
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                                 {showCreateNoteForm && (
                   <div className="mb-6">
                     <CreateNoteForm
                       onNoteCreated={handleNoteCreated}
                       lessons={lessons.map(lesson => ({
                         id: lesson.id,
                         title: lesson.title,
                         description: lesson.description,
                         content: lesson.content,
                         order: lesson.order_number || lesson.order,
                         status: lesson.status as any,
                         created_at: lesson.created_at,
                         updated_at: lesson.updated_at,
                         wtl_lesson_id: lesson.wtl_lesson_id,
                         sync_status: lesson.sync_status
                       }))}
                                               preselectedLessonId={selectedLessonForNote || undefined}
                       user={user || undefined}
                     />
                   </div>
                 )}

                 <NotesList
                   notes={notes}
                   lessons={lessons.map(lesson => ({
                     id: lesson.id,
                     title: lesson.title,
                     description: lesson.description,
                     content: lesson.content,
                     order: lesson.order_number || lesson.order,
                     status: lesson.status as any,
                     created_at: lesson.created_at,
                     updated_at: lesson.updated_at,
                     wtl_lesson_id: lesson.wtl_lesson_id,
                     sync_status: lesson.sync_status
                   }))}
                   onNoteUpdated={handleNoteUpdated}
                   onNoteDeleted={handleNoteDeleted}
                   user={user || undefined}
                 />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
