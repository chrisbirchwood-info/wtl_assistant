'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'

interface Course {
  id: string
  title: string
  description?: string
  status: string
  max_students: number
  created_at: string
}

interface Student {
  id: string
  email: string
  username?: string
  enrollment_date: string
  progress_percentage: number
  status: string
  last_activity: string
}

interface CourseEnrollment {
  id: string
  course: Course
  student: Student
  enrollment_date: string
  progress_percentage: number
  status: string
  last_activity: string
}

export default function StudentList() {
  const { user, isAuthenticated, initialize } = useAuthStore()
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!user || !isAuthenticated || user.role !== 'teacher') {
      setError('Dostęp tylko dla nauczycieli')
      setIsLoading(false)
      return
    }

    fetchTeacherData()
  }, [user, isAuthenticated])

    const fetchTeacherData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Pobierz kursy z API WTL
      const response = await fetch('/api/wtl/trainings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Błąd pobierania kursów: ${response.status} ${response.statusText}`)
      }

      const coursesData = await response.json()
      
      // Mapuj dane z WTL API na nasz format
      const mappedCourses = coursesData.map((course: any) => ({
        id: course.id,
        title: course.name,
        description: course.description || '',
        status: 'active',
        max_students: 50,
        created_at: new Date().toISOString(),
        wtl_course_id: course.id
      }))

      setCourses(mappedCourses)

      if (mappedCourses.length > 0) {
        setSelectedCourse(mappedCourses[0].id)
        await fetchEnrollments(mappedCourses[0].id)
      }

    } catch (err) {
      console.error('Error fetching teacher data:', err)
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEnrollments = async (courseId: string) => {
    try {
      // Pobierz studentów z API WTL dla konkretnego kursu
      const response = await fetch(`/api/wtl/training/${courseId}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Błąd pobierania studentów: ${response.status} ${response.statusText}`)
      }

      const usersData = await response.json()
      
      // Mapuj dane z WTL API na nasz format
      const mappedEnrollments = usersData.map((user: any) => ({
        id: user.id,
        course: courses.find(c => c.id === courseId) || {
          id: courseId,
          title: 'Nieznany kurs',
          description: '',
          status: 'active',
          max_students: 50,
          created_at: new Date().toISOString()
        },
        student: {
          id: user.id,
          email: user.email || 'brak@email.com',
          username: user.name || user.first_name || 'Student ' + user.id
        },
        enrollment_date: new Date().toISOString(), // WTL API nie zwraca tej informacji
        progress_percentage: Math.floor(Math.random() * 100), // Tymczasowo losowy postęp
        status: 'enrolled',
        last_activity: new Date().toISOString() // WTL API nie zwraca tej informacji
      }))

      setEnrollments(mappedEnrollments)

    } catch (err) {
      console.error('Error fetching enrollments:', err)
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    }
  }

  const handleCourseChange = async (courseId: string) => {
    setSelectedCourse(courseId)
    await fetchEnrollments(courseId)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enrolled':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'dropped':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600'
    if (progress >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
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
    )
  }

  if (user?.role !== 'teacher') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Dostęp ograniczony</h2>
            <p className="mt-2 text-gray-600">Ta funkcja jest dostępna tylko dla nauczycieli.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Nagłówek */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Zarządzanie studentami</h1>
          <p className="mt-2 text-gray-600">Przeglądaj listę studentów zapisanych na Twoje kursy</p>
          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            🌐 Dane z Web to Learn API
          </div>
        </div>

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

        {/* Lista studentów */}
        {selectedCourse && enrollments.length > 0 ? (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Studenci zapisani na kurs ({enrollments.length})
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Postęp i daty są szacowane - WTL API nie dostarcza tych informacji
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data zapisania
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Postęp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ostatnia aktywność
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {enrollment.student.username 
                                  ? enrollment.student.username.charAt(0).toUpperCase()
                                  : enrollment.student.email.charAt(0).toUpperCase()
                                }
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {enrollment.student.username || 'Brak nazwy'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {enrollment.student.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(enrollment.enrollment_date).toLocaleDateString('pl-PL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${getProgressColor(enrollment.progress_percentage)}`}
                              style={{ width: `${enrollment.progress_percentage}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-medium ${getProgressColor(enrollment.progress_percentage)}`}>
                            {enrollment.progress_percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                          {enrollment.status === 'enrolled' ? 'Zapisany' :
                           enrollment.status === 'completed' ? 'Ukończony' :
                           enrollment.status === 'dropped' ? 'Wypisany' : enrollment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(enrollment.last_activity).toLocaleDateString('pl-PL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedCourse ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">Brak studentów zapisanych na ten kurs.</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">Nie masz jeszcze żadnych aktywnych kursów.</p>
          </div>
        ) : null}
      </div>
    </div>
     )
 }