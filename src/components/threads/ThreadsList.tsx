"use client"

import { useState } from 'react'
import { ThreadWithConnections as NoteWithConnections, ThreadLessonConnection, Lesson } from '@/types/threads'

interface ThreadsListProps {
  threads: NoteWithConnections[]
  lessons?: Lesson[]
  onThreadUpdated: () => void
  onThreadDeleted: () => void
  user?: { id: string }
}

export default function ThreadsList({ threads, lessons = [], onThreadUpdated, onThreadDeleted, user }: ThreadsListProps) {
  const getConnections = (thread: NoteWithConnections | { thread_lesson_connections?: ThreadLessonConnection[] }): ThreadLessonConnection[] =>
    (thread as NoteWithConnections)?.lesson_connections ?? (thread as { thread_lesson_connections?: ThreadLessonConnection[] })?.thread_lesson_connections ?? []
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editLessonIds, setEditLessonIds] = useState<string[]>([])
  const [editConnectionTypes, setEditConnectionTypes] = useState<('primary' | 'related' | 'loose')[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [_error, setError] = useState<string | null>(null)

  const startEditing = (thread: NoteWithConnections) => {
    setEditingThreadId(thread.id)
    setEditTitle(thread.title)
    setEditContent(thread.content)
    const conns = getConnections(thread)
    setEditLessonIds(conns.map((conn: ThreadLessonConnection) => conn.lesson_id) || [])
    setEditConnectionTypes(conns.map((conn: ThreadLessonConnection) => conn.connection_type) || [])
    setError(null)
  }

  const cancelEditing = () => {
    setEditingThreadId(null)
    setEditTitle('')
    setEditContent('')
    setEditLessonIds([])
    setEditConnectionTypes([])
    setError(null)
  }

  const handleLessonSelection = (lessonId: string, checked: boolean) => {
    if (checked) {
      setEditLessonIds(prev => [...prev, lessonId])
      setEditConnectionTypes(prev => [...prev, 'related'])
    } else {
      const index = editLessonIds.indexOf(lessonId)
      setEditLessonIds(prev => prev.filter(id => id !== lessonId))
      setEditConnectionTypes(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleConnectionTypeChange = (lessonId: string, newType: 'primary' | 'related' | 'loose') => {
    const index = editLessonIds.indexOf(lessonId)
    if (index !== -1) {
      const newTypes = [...editConnectionTypes]
      newTypes[index] = newType
      setEditConnectionTypes(newTypes)
    }
  }

  const handleUpdate = async (threadId: string) => {
    if (!editTitle.trim() || !editContent.trim()) {
      setError('Tytuł i treść są wymagane')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const updateData = {
        title: editTitle.trim(),
        content: editContent.trim(),
        lesson_ids: editLessonIds.length > 0 ? editLessonIds : [],
        connection_types: editLessonIds.length > 0 ? editConnectionTypes : []
      }

      const response = await fetch(`/api/threads/${threadId}?user_id=${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id || 'local'}`
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Błąd podczas aktualizacji wątku')
      }

      setEditingThreadId(null)
      onThreadUpdated()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (threadId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten wątek?')) {
      return
    }

    try {
      const response = await fetch(`/api/threads/${threadId}?user_id=${user?.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.id || 'local'}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Błąd podczas usuwania wątku')
      }

      onThreadDeleted()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    }
  }

  if (threads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Brak wątków</h3>
        <p className="text-gray-500">Nie masz jeszcze żadnych wątków. Utwórz pierwszy!</p>
      </div>
    )
  }

  const getConnectionTypeLabel = (type: 'primary' | 'related' | 'loose') => {
    switch (type) {
      case 'primary': return 'Główne'
      case 'related': return 'Powiązane'
      case 'loose': return 'Luźne'
      default: return 'Powiązane'
    }
  }

  const getConnectionTypeColor = (type: 'primary' | 'related' | 'loose') => {
    switch (type) {
      case 'primary': return 'bg-blue-100 text-blue-800'
      case 'related': return 'bg-green-100 text-green-800'
      case 'loose': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-4">
      {_error && (
        <div className="text-sm text-red-600">{_error}</div>
      )}
      {threads.map((thread) => (
        <div key={thread.id} className="bg-white rounded-lg shadow p-4">
          {editingThreadId === thread.id ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tytuł wątku *"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Treść wątku *"
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Powiąż lekcje:</label>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      const val = e.target.value
                      if (val) handleLessonSelection(val, true)
                    }}
                    value=""
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Wybierz lekcję do dodania --</option>
                    {lessons
                      .filter(lesson => !editLessonIds.includes(lesson.id) && !(lesson.wtl_lesson_id && editLessonIds.includes(lesson.wtl_lesson_id)))
                      .map(lesson => (
                        <option key={lesson.id} value={lesson.id}>
                          {lesson.title}
                        </option>
                      ))
                    }
                  </select>

                  {editLessonIds.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3">
                      {editLessonIds.map((lessonId, index) => {
                        const lesson = lessons.find(l => l.id === lessonId || l.wtl_lesson_id === lessonId)
                        if (!lesson) return null
                        return (
                          <div key={lessonId} className="flex items-center space-x-3 bg-gray-50 p-2 rounded">
                            <span className="flex-1 text-sm text-gray-700">{lesson.title}</span>
                            <select
                              value={editConnectionTypes[index] || 'related'}
                              onChange={(e) => handleConnectionTypeChange(lessonId, e.target.value as 'primary' | 'related' | 'loose')}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="primary">Główne</option>
                              <option value="related">Powiązane</option>
                              <option value="loose">Luźne</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleLessonSelection(lessonId, false)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-3">
                <button onClick={() => handleUpdate(thread.id)} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                  {isSubmitting ? 'Zapisuję...' : 'Zapisz'}
                </button>
                <button onClick={cancelEditing} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">Anuluj</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-lg font-semibold text-gray-900">{thread.title}</h4>
                <div className="flex space-x-2">
                  <button onClick={() => startEditing(thread)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edytuj</button>
                  <button onClick={() => handleDelete(thread.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Usuń</button>
                </div>
              </div>

              <p className="text-gray-700 mb-4 whitespace-pre-wrap">{thread.content}</p>

              {getConnections(thread).length > 0 ? (
                <div className="border-t pt-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Powiązane lekcje:</h5>
                  <div className="flex flex-wrap gap-2">
                    {getConnections(thread).map((connection: ThreadLessonConnection) => (
                      <span key={connection.id} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConnectionTypeColor(connection.connection_type)}`}>
                        {getConnectionTypeLabel(connection.connection_type)}: {(lessons.find(l => l.id === connection.lesson_id || l.wtl_lesson_id === connection.lesson_id)?.title) || connection.lesson_id}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border-t pt-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">🧵 Luźny wątek</span>
                </div>
              )}

              <div className="text-xs text-gray-500 mt-3">
                Utworzono: {new Date(thread.created_at).toLocaleDateString('pl-PL')}
                {thread.updated_at !== thread.created_at && ` • Zaktualizowano: ${new Date(thread.updated_at).toLocaleDateString('pl-PL')}`}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
