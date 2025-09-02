'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuthStore } from '@/store/auth-store'
import { ThreadWithConnections as NoteWithConnections, ThreadLessonConnection } from '@/types/threads'
import CreateThreadForm from '@/components/threads/CreateThreadForm'
import Modal from '@/components/ui/Modal'

interface Lesson {
  id: string
  title: string
  description?: string
  content?: string
  order_number?: number
  order?: number
  status: 'active' | 'inactive' | 'draft'
  created_at: string
  updated_at: string
  wtl_lesson_id?: string
  sync_status?: string
  course_id?: string
}

interface Student {
  id: string
  email: string
  username?: string
}

interface Course {
  id: string
  title: string
  description?: string
  status: string
  wtl_course_id?: string
}

export default function StudentThreadsListPage() {
  const { user, isAuthenticated, initialize } = useAuthStore()
  const params = useParams()
  const teacherId = params.teacherId as string
  const studentId = params.studentId as string

  const [student, setStudent] = useState<Student | null>(null)
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  // Keep latest lessons in a ref to avoid callback identity churn
  const lessonsRef = useRef<Lesson[]>([])
  const [threads, setThreads] = useState<NoteWithConnections[]>([])
  const [showCreateThreadForm, setShowCreateThreadForm] = useState(false)
  const [selectedLessonForThread, setSelectedLessonForThread] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => { initialize() }, [initialize])


  const hasAccess = useCallback((): boolean => {
    if (!user) return false
    if (user.role === 'superadmin') return true
    if (user.role === 'teacher') return user.id === teacherId
    if (user.role === 'student') return user.id === studentId
    return false
  }, [user, teacherId, studentId])


  const openCreateThreadForm = (lessonId?: string) => {
    setSelectedLessonForThread(lessonId || null)
    setShowCreateThreadForm(true)
  }

  type LessonConnectionLite = { lesson_id: string }
  type AnyThread = NoteWithConnections | { lesson_connections?: LessonConnectionLite[]; thread_lesson_connections?: LessonConnectionLite[] }
  const refreshThreadsOnly = useCallback(async (email?: string, allLessons?: Lesson[]) => {
    try {
      setIsRefreshing(true)
      const emailParam = email ? `&owner_email=${encodeURIComponent(email)}` : ''
      const threadsResp = await fetch(`/api/threads?include_connections=true&owner_student_id=${studentId}${emailParam}`, { cache: 'no-store' })
      const threadsJson = threadsResp.ok ? await threadsResp.json() : { threads: [] }
      const lessonsBase = allLessons || lessonsRef.current
      const allowedLocalIds = new Set(lessonsBase.map(l => l.id))
      const allowedWtlIds = new Set(lessonsBase.map(l => l.wtl_lesson_id).filter(Boolean) as string[])
      type LegacyThread = { thread_lesson_connections?: LessonConnectionLite[] }
      const filtered = (threadsJson.threads || []).filter((n: AnyThread) =>
        !(n.lesson_connections && n.lesson_connections.length > 0) ||
        (n.lesson_connections || (n as LegacyThread).thread_lesson_connections || []).some((c: LessonConnectionLite) => allowedLocalIds.has(c.lesson_id) || allowedWtlIds.has(c.lesson_id))
      )
      setThreads(filtered)
    } finally {
      setIsRefreshing(false)
    }
  }, [studentId])


  const fetchBaseData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const studentResp = await fetch(`/api/teacher/students/${studentId}`, { cache: 'no-store' })
      if (!studentResp.ok) throw new Error('Błąd pobierania danych studenta')
      const studentJson = await studentResp.json()
      setStudent(studentJson.user)

      const [studentCoursesResp, teacherCoursesResp] = await Promise.all([
        fetch(`/api/students/${studentId}/courses/local`, { cache: 'no-store' }),
        fetch(`/api/courses/local?teacherId=${teacherId}`, { cache: 'no-store' })
      ])

      const studentCourses: Course[] = studentCoursesResp.ok ? (await studentCoursesResp.json()).courses || [] : []
      const teacherCourses: Course[] = teacherCoursesResp.ok ? (await teacherCoursesResp.json()).courses || [] : []
      const teacherCourseIds = new Set(teacherCourses.map(c => c.id))
      const available = studentCourses.filter(c => teacherCourseIds.has(c.id))
      setAvailableCourses(available)

      const lessonsPromises = available.map(c => fetch(`/api/lessons?courseId=${c.id}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : { lessons: [] }))
      const lessonsArrays = await Promise.all(lessonsPromises)
      const allLessons: Lesson[] = lessonsArrays.flatMap((j: { lessons?: Lesson[] }) => (j.lessons || []))
      lessonsRef.current = allLessons
      setLessons(allLessons)

      await refreshThreadsOnly(studentJson.user?.email, allLessons)

    } catch (err) {
      console.error('Error fetching base data:', err)
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setIsLoading(false)
    }
  }, [studentId, teacherId])
  const handleThreadCreated = () => { refreshThreadsOnly(student?.email, lessonsRef.current) }

  useEffect(() => {
    if (!user || !isAuthenticated) return

    if (!hasAccess()) {
      setError('Brak uprawnień do przeglądania tego widoku')
      setIsLoading(false)
      return
    }

    fetchBaseData()
  }, [user, isAuthenticated, teacherId, studentId, hasAccess, fetchBaseData])

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    )
  }


  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">{error}</div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Wątki studenta</h1>
              <p className="mt-2 text-gray-600">{student?.username || student?.email}</p>
              <p className="mt-1 text-sm text-gray-500">Wspólne kursy: {availableCourses.length}</p>
            </div>
            <div className="flex items-center gap-3">
              {isRefreshing && (<span className="text-sm text-gray-500">Odświeżanie…</span>)}
              <button
                onClick={() => openCreateThreadForm()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                + Nowy wątek
              </button>
            </div>
          </div>

          <Modal open={showCreateThreadForm} onClose={() => setShowCreateThreadForm(false)} title="Nowy wątek" maxWidthClassName="max-w-3xl">
            <CreateThreadForm
              onThreadCreated={() => { setShowCreateThreadForm(false); handleThreadCreated() }}
              lessons={lessons.map((lesson) => ({
                id: lesson.id,
                title: lesson.title,
                description: lesson.description,
                content: lesson.content,
                order: lesson.order_number || lesson.order,
                status: lesson.status,
                created_at: lesson.created_at,
                updated_at: lesson.updated_at,
                wtl_lesson_id: lesson.wtl_lesson_id,
                sync_status: lesson.sync_status
              }))}
              preselectedLessonId={selectedLessonForThread || undefined}
              user={{ id: studentId }}
            />
          </Modal>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Wątki ({threads.length})</h3>
              <p className="mt-1 text-sm text-gray-500">Każdy wątek można powiązać z lekcjami różnych kursów.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tytuł</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lekcje</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utworzono</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {threads.map((thread) => {
                    const conns: ThreadLessonConnection[] = (thread as NoteWithConnections).lesson_connections || []
                    const lessonsCount = conns.length
                    return (
                      <tr key={thread.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a
                            href={`/teacher/${teacherId}/students/${studentId}/threads/${thread.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            {thread.title}
                          </a>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{thread.content}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lessonsCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(thread.created_at).toLocaleDateString('pl-PL')}</td>
                      </tr>
                    )
                  })}
                  {threads.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500">Brak wątków</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

