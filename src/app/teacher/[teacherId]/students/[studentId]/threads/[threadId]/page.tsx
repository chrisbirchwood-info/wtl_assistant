'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuthStore } from '@/store/auth-store'
import ThreadSurveyLinker from '@/components/threads/ThreadSurveyLinker'
import ThreadNotesSection from '@/components/threads/ThreadNotesSection'
import ThreadTasksSection from '@/components/threads/ThreadTasksSection'
import ThreadNoteComposer from '@/components/threads/ThreadNoteComposer'
import ThreadChecklistSection from '@/components/threads/ThreadChecklistSection'
import { ThreadSurveyData } from '@/types/threads'
import CollapseHeader from '@/components/ui/CollapseHeader'

interface ThreadConnection {
  id: string
  note_id: string
  lesson_id: string
  connection_type: 'primary' | 'related' | 'loose'
  created_at: string
}

interface Thread {
  id: string
  title: string
  content: string
  user_id: string
  created_at: string
  updated_at: string
  lesson_connections?: ThreadConnection[]
  survey_connections?: any[]
}

interface Lesson { id: string; title: string; wtl_lesson_id?: string; course_id?: string }
interface Course { id: string; title: string }

export default function ThreadDetailsPage() {
  const { user, isAuthenticated, initialize } = useAuthStore()
  const params = useParams()
  const teacherId = params.teacherId as string
  const studentId = params.studentId as string
  const threadId = params.threadId as string

  const [thread, setThread] = useState<Thread | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [surveyData, setSurveyData] = useState<ThreadSurveyData[]>([])
  const [studentEmail, setStudentEmail] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSurveySection, setShowSurveySection] = useState(false)
  const [surveyCollapsed, setSurveyCollapsed] = useState(true)
  const [forceOpenSelector, setForceOpenSelector] = useState(false)
  const [showNotesSection, setShowNotesSection] = useState(true)
  const [notesCollapsed, setNotesCollapsed] = useState(false)
  const [noteComposerOpen, setNoteComposerOpen] = useState(false)
  const [notesRefresh, setNotesRefresh] = useState(0)
  const [notesCount, setNotesCount] = useState(0)
  const [showTasksSection, setShowTasksSection] = useState(false)
  const [tasksCollapsed, setTasksCollapsed] = useState(false)
  const [tasksRefresh, setTasksRefresh] = useState(0)
  const [tasksCount, setTasksCount] = useState(0)
  const [openTaskComposerSignal, setOpenTaskComposerSignal] = useState(0)
  const [showChecklistSection, setShowChecklistSection] = useState(false)
  const [checklistCollapsed, setChecklistCollapsed] = useState(false)
  const [checklistRefresh, setChecklistRefresh] = useState(0)
  const [openChecklistComposerSignal, setOpenChecklistComposerSignal] = useState(0)
  const [checklistCount, setChecklistCount] = useState(0)

  // Derive a primary survey title (first connection) if any
  const primarySurveyTitle = (surveyData && surveyData.length > 0)
    ? (surveyData[0].form_title || `Ankieta ${surveyData[0].form_id}`)
    : null

  useEffect(() => { initialize() }, [initialize])


  const hasAccess = useCallback((): boolean => {
    if (!user) return false
    if (user.role === 'superadmin') return true
    if (user.role === 'teacher') return user.id === teacherId
    if (user.role === 'student') return user.id === studentId
    return false
  }, [user, teacherId, studentId])

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const noteResp = await fetch(`/api/threads/${threadId}`, { cache: 'no-store' })
      if (!noteResp.ok) throw new Error('Błąd pobierania wątku')
      const noteJson = await noteResp.json()
      setThread(noteJson.thread)

      const [studentCoursesResp, teacherCoursesResp] = await Promise.all([
        fetch(`/api/students/${studentId}/courses/local`, { cache: 'no-store' }),
        fetch(`/api/courses/local?teacherId=${teacherId}`, { cache: 'no-store' })
      ])
      const studentCourses = studentCoursesResp.ok ? (await studentCoursesResp.json()).courses || [] : []
      const teacherCourses = teacherCoursesResp.ok ? (await teacherCoursesResp.json()).courses || [] : []
      const teacherCourseIds = new Set((teacherCourses || []).map((c: Course) => c.id))
      const available = (studentCourses || []).filter((c: Course) => teacherCourseIds.has(c.id))
      setCourses(available.map((c: Course) => ({ id: c.id, title: c.title })))

      const lessonsPromises = available.map((c: Course) => fetch(`/api/lessons?courseId=${c.id}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : { lessons: [] }))
      const lessonsArrays = await Promise.all(lessonsPromises)
      const allLessons: Lesson[] = lessonsArrays.flatMap((j: { lessons?: Lesson[] }) => (j.lessons || []))
      setLessons(allLessons)

      // Fetch student email and survey data
      if (noteJson.thread?.user_id) {
        const userResponse = await fetch(`/api/admin/users/${noteJson.thread.user_id}`, { cache: 'no-store' })
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setStudentEmail(userData.user?.email || '')
        }
      }
      
      // Fetch survey data for this thread
      const visibilityFor = (user?.role === 'student') ? 'student' : 'teacher'
      const surveyResponse = await fetch(`/api/threads/survey-connections?thread_id=${threadId}&visibility_for=${visibilityFor}`, { cache: 'no-store' })
      if (surveyResponse.ok) {
        const surveyJson = await surveyResponse.json()
        setSurveyData(surveyJson.survey_data || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setIsLoading(false)
    }
  }, [teacherId, studentId, threadId])
  useEffect(() => {
    if (!user || !isAuthenticated) return
    if (!hasAccess()) { setError('Brak uprawnień do przeglądania wątku'); setIsLoading(false); return }
    fetchData()
  }, [user, isAuthenticated, teacherId, studentId, threadId, hasAccess, fetchData])

  const courseTitleForLesson = (lessonId: string, lessonFromConn?: { course_id?: string } | null): string => {
    // Prefer course_id delivered with the connection (joined lesson)
    const byConnCourseId = lessonFromConn?.course_id
    if (byConnCourseId) {
      const course = courses.find(c => c.id === byConnCourseId)
      if (course?.title) return course.title
    }
    // Fallback: try to match from locally fetched lessons
    const lesson = lessons.find(l => l.id === lessonId || l.wtl_lesson_id === lessonId)
    if (!lesson) return '-'
    const course = courses.find(c => c.id === (lesson as any).course_id)
    return course?.title || '-'
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">{error}</div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!thread) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-4xl mx-auto px-4">Nie znaleziono wątku.</div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{thread.title}</h1>
              <p className="text-sm text-gray-500 mt-1">Utworzono: {new Date(thread.created_at).toLocaleString('pl-PL')}{thread.updated_at && (` • Zaktualizowano: ${new Date(thread.updated_at).toLocaleString('pl-PL')}`)}</p>
            </div>
            <div className="flex items-center gap-2 relative">
              <a
                href={`/teacher/${teacherId}/students/${studentId}/threads`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                ← Wróć do wątków
              </a>
              {user?.role === 'teacher' && (
                <div className="relative">
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((v) => !v)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    title="Opcje"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setShowNotesSection(true)
                          setNotesCollapsed(false)
                          setNoteComposerOpen(true)
                          setMenuOpen(false)
                        }}
                      >
                        Dodaj notatkę
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setShowTasksSection(true)
                          setTasksCollapsed(false)
                          setOpenTaskComposerSignal(v => v + 1)
                          setMenuOpen(false)
                        }}
                      >
                        Dodaj zadanie
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setShowChecklistSection(true)
                          setChecklistCollapsed(false)
                          setOpenChecklistComposerSignal(v => v + 1)
                          setMenuOpen(false)
                        }}
                      >
                        Dodaj checklistę
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setShowSurveySection(true)
                          setSurveyCollapsed(false)
                          setForceOpenSelector(true)
                          setMenuOpen(false)
                        }}
                      >
                        Dodaj ankietę
                      </button>
                      {showSurveySection && (surveyData?.length || 0) === 0 && (
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => {
                            setShowSurveySection(false)
                            setMenuOpen(false)
                          }}
                        >
                          Ukryj sekcję ankiet
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="prose max-w-none whitespace-pre-wrap">{thread.content}</div>

            <div className="mt-6 border-t pt-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Powiążane lekcje</h2>
              {thread.lesson_connections && thread.lesson_connections.length > 0 ? (
                <ul className="space-y-2">
                  {thread.lesson_connections.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">{c.connection_type}</span>
                      <span className="text-gray-400">–</span>
                      <span className="flex-1 break-words">{((c as any).lesson?.title) ? (c as any).lesson.title : `ID lekcji: ${c.lesson_id}`}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Brak powiązań — luźny wątek.</p>
              )}
              </div>

              {/* Tasks section inside thread */}
              {user?.role === 'teacher' && (
                <div className="mt-6 border-t pt-4">
                  <CollapseHeader
                    title="Zadania"
                    collapsed={tasksCollapsed}
                    onToggle={() => setTasksCollapsed(v => !v)}
                    ariaControls="tasks-section"
                    className="mb-4 hidden"
                  />
                  {!tasksCollapsed && (
                    <div id="tasks-section" className="space-y-4">
                      <ThreadTasksSection
                        threadId={threadId}
                        user={user || undefined}
                        defaultOpen={false}
                        externalRefreshTrigger={tasksRefresh}
                        onTasksCountChange={(c) => setTasksCount(c)}
                        hideHeader={false}
                        viewerRole={(user as any)?.role as any}
                        openComposerSignal={openTaskComposerSignal}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Checklist section inside thread */}
              {user?.role === 'teacher' && (
                <div className={`mt-6 border-t pt-4 ${(!showChecklistSection && checklistCount === 0) ? 'hidden' : ''}`}>
                  <CollapseHeader
                    title="Checklisty"
                    collapsed={checklistCollapsed}
                    onToggle={() => setChecklistCollapsed(v => !v)}
                    ariaControls="checklist-section"
                    className="mb-4 hidden"
                  />
                  {!checklistCollapsed && (
                    <div id="checklist-section" className="space-y-4">
                      <ThreadChecklistSection
                        threadId={threadId}
                        user={user || undefined}
                        defaultOpen={false}
                        externalRefreshTrigger={checklistRefresh}
                        hideHeader={false}
                        viewerRole={(user as any)?.role as any}
                        openComposerSignal={openChecklistComposerSignal}
                        onChecklistsCountChange={(c) => setChecklistCount(c)}
                        onCancelNew={() => setShowChecklistSection(false)}
                      />
                    </div>
                  )}
                </div>
              )}

              
              {/* (Removed duplicate) Tasks section – kept only one instance above */}

              {/* Notes section */}
            {user?.role === 'teacher' && showNotesSection && (
              <div className="mt-6 border-t pt-4">
                <CollapseHeader
                  title="Notatki"
                  collapsed={notesCollapsed}
                  onToggle={() => setNotesCollapsed(v => !v)}
                  ariaControls="notes-section"
                  className="mb-4 hidden"
                />
                <div className="mb-4 flex items-center justify-between hidden">
                  <h2 className="text-sm font-semibold text-gray-700">Notatki</h2>
                  <button
                    type="button"
                    onClick={() => setNotesCollapsed(v => !v)}
                    className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800"
                    aria-expanded={!notesCollapsed}
                  >
                    {notesCollapsed ? 'Rozwiń' : 'Zwiń'}
                  </button>
                </div>
                {!notesCollapsed && (
                  <div id="notes-section" className="space-y-4">
                    {noteComposerOpen && (
                      <ThreadNoteComposer
                        threadId={threadId}
                        user={user || undefined}
                        onSaved={() => { setNoteComposerOpen(false); setNotesRefresh(v => v + 1) }}
                        onCancel={() => setNoteComposerOpen(false)}
                      />
                    )}
                    <ThreadNotesSection
                      threadId={threadId}
                      user={user || undefined}
                      defaultOpen={false}
                      hideComposerControls
                      externalRefreshTrigger={notesRefresh}
                      onNotesCountChange={(c) => setNotesCount(c)}
                      hideHeader
                      teacherId={teacherId}
                      studentId={studentId}
                      viewerRole={(user as any)?.role as any}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Survey connections section - hidden until requested unless existing connections present */}
            {user?.role === 'teacher' && (showSurveySection || (surveyData?.length || 0) > 0) && (
              <div className="mt-6 border-t pt-4">
                <CollapseHeader
                  title={primarySurveyTitle ? (
                    <>Ankieta: <span className="font-semibold">{primarySurveyTitle}</span></>
                  ) : (
                    'Ankiety'
                  )}
                  collapsed={surveyCollapsed}
                  onToggle={() => setSurveyCollapsed(v => !v)}
                  ariaControls="survey-section"
                  className="mb-4"
                  rightContent={
                    (user as any)?.role !== 'student' && (surveyData?.length || 0) > 0 ? (
                      (() => {
                        const allPrivate = (surveyData || []).length > 0 && (surveyData || []).every((c: any) => (c as any).visibility === 'private')
                        const next = allPrivate ? 'public' : 'private'
                        return (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                await Promise.all(
                                  (surveyData || []).map((c: any) =>
                                    fetch('/api/threads/survey-connections', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ connection_id: c.connection_id, visibility: next })
                                    })
                                  )
                                )
                                // optimistic update
                                setSurveyData((arr: any) => (arr || []).map((c: any) => ({ ...c, visibility: next })))
                              } catch {}
                            }}
                              className={`inline-flex items-center p-1 rounded ${allPrivate ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                              title={allPrivate ? 'Prywatna (tylko mentor)' : 'Widoczna dla wszystkich'}
                              aria-label={allPrivate ? 'Prywatna' : 'Publiczna'}
                          >
                            {allPrivate ? (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1v-7a1 1 0 00-1-1h-1V6a4 4 0 00-4-4zm2 6V6a2 2 0 10-4 0v2h4z" clipRule="evenodd"/></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M5 8a5 5 0 0110 0v1h1a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V10a1 1 0 011-1h1V8zm2 1V8a3 3 0 016 0v1H7z" clipRule="evenodd"/></svg>
                            )}
                          </button>
                        )
                      })()
                    ) : null
                  }
                />
                <div className="mb-4 flex items-center justify-between hidden">
                  <h2 className="text-sm font-semibold text-gray-700">
                    {primarySurveyTitle ? (
                      <>Ankieta: <span className="font-semibold">{primarySurveyTitle}</span></>
                    ) : (
                      'Ankiety'
                    )}
                  </h2>
                  {(surveyData?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setSurveyCollapsed(v => !v)}
                      className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800"
                      aria-expanded={!surveyCollapsed}
                      aria-controls="survey-section"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${surveyCollapsed ? '' : 'rotate-180'}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                      </svg>
                      {surveyCollapsed ? 'Rozwiń' : 'Zwiń'}
                    </button>
                  )}
                </div>
                {!surveyCollapsed && (
                  <div id="survey-section">
                    <ThreadSurveyLinker
                      threadId={threadId}
                      teacherId={teacherId}
                      studentEmail={studentEmail}
                      existingConnections={surveyData}
                      defaultOpen={showSurveySection && (surveyData?.length || 0) === 0}
                      forceOpen={forceOpenSelector}
                      viewerRole={user?.role as any}
                      onCancel={() => {
                        if ((surveyData?.length || 0) > 0) {
                          setSurveyCollapsed(true)
                        } else {
                          setShowSurveySection(false)
                        }
                        setForceOpenSelector(false)
                      }}
                      onLinked={() => {
                        // Refresh survey data after linking
                        setForceOpenSelector(false)
                        fetchData()
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}


