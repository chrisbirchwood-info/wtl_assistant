'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

interface Course {
  id: string
  title: string
  description?: string
  status: string
  max_students: number
  created_at: string
  wtl_course_id?: string
  last_sync_at?: string
  sync_status?: string
}

interface Teacher {
  id: string
  email: string
  username?: string
  first_name?: string
  last_name?: string
  role: string
  is_active: boolean
  created_at: string
}

interface CourseTeacher {
  id: string
  course_id: string
  teacher_id: string
  role: string
  assigned_at: string
  assigned_by?: string
  is_active: boolean
  teacher: Teacher
  assigned_by_user?: Teacher
}

export default function AdminCoursesPage() {
  const { user, isAuthenticated, initialize } = useAuthStore()
  const [courses, setCourses] = useState<Course[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [courseTeachers, setCourseTeachers] = useState<CourseTeacher[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Form states
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<string>('teacher')

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!user || !isAuthenticated || user.role !== 'superadmin') {
      setError('Dostęp tylko dla superadmin')
      setIsLoading(false)
      return
    }

    fetchData()
  }, [user, isAuthenticated])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Pobierz kursy
      const coursesResponse = await fetch('/api/courses/local')
      if (!coursesResponse.ok) throw new Error('Błąd pobierania kursów')
      const coursesData = await coursesResponse.json()
      setCourses(coursesData.courses || [])

      // Pobierz nauczycieli
      const teachersResponse = await fetch('/api/admin/teachers')
      if (!teachersResponse.ok) throw new Error('Błąd pobierania nauczycieli')
      const teachersData = await teachersResponse.json()
      setTeachers(teachersData.teachers || [])

      if (coursesData.courses?.length > 0) {
        setSelectedCourse(coursesData.courses[0].id)
        await fetchCourseTeachers(coursesData.courses[0].id)
      }

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCourseTeachers = async (courseId: string) => {
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/teachers`)
      if (!response.ok) throw new Error('Błąd pobierania nauczycieli kursu')
      
      const data = await response.json()
      setCourseTeachers(data.teachers || [])
    } catch (err) {
      console.error('Error fetching course teachers:', err)
      setError(err instanceof Error ? err.message : 'Błąd pobierania nauczycieli kursu')
    }
  }

  const handleCourseChange = async (courseId: string) => {
    setSelectedCourse(courseId)
    await fetchCourseTeachers(courseId)
  }

  const syncCourses = async () => {
    try {
      setIsSyncing(true)
      setError(null)

      const response = await fetch('/api/courses/sync', { method: 'POST' })
      if (!response.ok) throw new Error('Błąd synchronizacji kursów')

      const result = await response.json()
      
      // Utwórz szczegółowy komunikat sukcesu
      let message = 'Kursy zostały zsynchronizowane z WTL'
      if (result.result?.lessons) {
        const lessons = result.result.lessons
        message += `\n\n📚 Lekcje: ${lessons.created} zsynchronizowanych`
        if (lessons.errors > 0) {
          message += `, ${lessons.errors} błędów`
        }
      }
      
      setSuccessMessage(message)
      
      // Odśwież dane
      await fetchData()
      
    } catch (err) {
      console.error('Error syncing courses:', err)
      setError(err instanceof Error ? err.message : 'Błąd synchronizacji')
    } finally {
      setIsSyncing(false)
    }
  }

  const assignTeacher = async () => {
    try {
      if (!selectedTeacherId || !selectedCourse) {
        setError('Wybierz nauczyciela i kurs')
        return
      }
      
      // Sprawdź czy user ma prawidłowe ID
      if (!user?.id) {
        setError('Błąd autoryzacji: brak ID użytkownika')
        return
      }
      
      // Debug: wyświetl ID użytkownika (opcjonalne)
      console.log('🔍 Debug - User ID:', user.id)

      const response = await fetch(`/api/admin/courses/${selectedCourse}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacherId,
          role: selectedRole,
          assignedBy: user.id // user.id jest już zwalidowane
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Błąd przypisywania nauczyciela')
      }

      setSuccessMessage('Nauczyciel został przypisany do kursu')
      setShowAssignForm(false)
      setSelectedTeacherId('')
      setSelectedRole('teacher')
      
      // Odśwież dane
      await fetchCourseTeachers(selectedCourse)
      
    } catch (err) {
      console.error('Error assigning teacher:', err)
      setError(err instanceof Error ? err.message : 'Błąd przypisywania nauczyciela')
    }
  }

  const removeTeacher = async (teacherId: string) => {
    try {
      if (!confirm('Czy na pewno chcesz usunąć tego nauczyciela z kursu?')) return

      const response = await fetch(`/api/admin/courses/${selectedCourse}/teachers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Błąd usuwania nauczyciela')
      }

      setSuccessMessage('Nauczyciel został usunięty z kursu')
      
      // Odśwież dane
      await fetchCourseTeachers(selectedCourse)
      
    } catch (err) {
      console.error('Error removing teacher:', err)
      setError(err instanceof Error ? err.message : 'Błąd usuwania nauczyciela')
    }
  }

  const updateTeacherRole = async (teacherId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/courses/${selectedCourse}/teachers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, role: newRole })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Błąd aktualizacji roli')
      }

      setSuccessMessage('Rola nauczyciela została zaktualizowana')
      
      // Odśwież dane
      await fetchCourseTeachers(selectedCourse)
      
    } catch (err) {
      console.error('Error updating teacher role:', err)
      setError(err instanceof Error ? err.message : 'Błąd aktualizacji roli')
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['superadmin']}>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={['superadmin']}>
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
    <ProtectedRoute allowedRoles={['superadmin']}>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Nagłówek */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Zarządzanie kursami</h1>
            <p className="mt-2 text-gray-600">Przypisuj nauczycieli do kursów i zarządzaj ich rolami</p>
          </div>

          {/* Przyciski akcji */}
          <div className="mb-6 flex space-x-4">
            <button
              onClick={syncCourses}
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
                '🔄 Synchronizuj kursy z WTL'
              )}
            </button>
          </div>

          {/* Komunikat sukcesu */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-green-800 whitespace-pre-line">
                    {successMessage}
                  </div>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => setSuccessMessage(null)}
                    className="text-green-400 hover:text-green-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Wybór kursu */}
          {courses.length > 0 && (
            <div className="mb-6">
              <label htmlFor="course-select" className="block text-sm font-medium text-gray-700 mb-2">
                Wybierz kurs
              </label>
              <select
                id="course-select"
                value={selectedCourse}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="block w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lista nauczycieli kursu */}
          {selectedCourse && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Nauczyciele przypisani do kursu
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {courseTeachers.length} nauczycieli przypisanych
                  </p>
                </div>
                <button
                  onClick={() => setShowAssignForm(!showAssignForm)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {showAssignForm ? 'Anuluj' : '➕ Przypisz nauczyciela'}
                </button>
              </div>

              {/* Formularz przypisywania */}
              {showAssignForm && (
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nauczyciel
                      </label>
                      <select
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Wybierz nauczyciela</option>
                        {teachers
                          .filter(teacher => !courseTeachers.some(ct => ct.teacher_id === teacher.id))
                          .map(teacher => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.username || teacher.email}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rola
                      </label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="teacher">Nauczyciel</option>
                        <option value="assistant">Asystent</option>
                        <option value="coordinator">Koordynator</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={assignTeacher}
                        disabled={!selectedTeacherId}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          selectedTeacherId
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-gray-400 cursor-not-allowed'
                        } text-white`}
                      >
                        Przypisz
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista nauczycieli */}
              {courseTeachers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nauczyciel
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rola
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data przypisania
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Akcje
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {courseTeachers.map((courseTeacher) => (
                        <tr key={courseTeacher.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {(courseTeacher.teacher.username || courseTeacher.teacher.email).charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {courseTeacher.teacher.username || 'Brak nazwy'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {courseTeacher.teacher.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={courseTeacher.role}
                              onChange={(e) => updateTeacherRole(courseTeacher.teacher_id, e.target.value)}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            >
                              <option value="teacher">Nauczyciel</option>
                              <option value="assistant">Asystent</option>
                              <option value="coordinator">Koordynator</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(courseTeacher.assigned_at).toLocaleDateString('pl-PL')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => removeTeacher(courseTeacher.teacher_id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Usuń
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Brak nauczycieli</h3>
                  <p className="text-sm text-gray-600">
                    Do tego kursu nie jest jeszcze przypisany żaden nauczyciel.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Brak kursów */}
          {courses.length === 0 && (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 5.477 5.754 5 7.5 5s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.523 18.246 19 16.5 19c-1.746 0-3.332-.477-4.5-1.253" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Brak kursów</h3>
                <p className="text-sm text-gray-600">
                  Nie masz jeszcze żadnych kursów w systemie.
                </p>
                <button
                  onClick={syncCourses}
                  disabled={isSyncing}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  🔄 Synchronizuj kursy z WTL
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
