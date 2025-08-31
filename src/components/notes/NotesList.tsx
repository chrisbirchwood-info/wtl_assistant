'use client'

import { useState, useEffect } from 'react'
import { Note, NoteWithConnections, Lesson } from '@/types/notes'

interface NotesListProps {
  notes: NoteWithConnections[]
  lessons?: Lesson[]
  onNoteUpdated: () => void
  onNoteDeleted: () => void
  user?: { id: string }
}

export default function NotesList({ notes, lessons = [], onNoteUpdated, onNoteDeleted, user }: NotesListProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editLessonIds, setEditLessonIds] = useState<string[]>([])
  const [editConnectionTypes, setEditConnectionTypes] = useState<('primary' | 'related' | 'loose')[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEditing = (note: NoteWithConnections) => {
    setEditingNoteId(note.id)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditLessonIds(note.lesson_connections?.map(conn => conn.lesson_id) || [])
    setEditConnectionTypes(note.lesson_connections?.map(conn => conn.connection_type) || [])
    setError(null)
  }

  const cancelEditing = () => {
    setEditingNoteId(null)
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

  const handleUpdate = async (noteId: string) => {
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

      const response = await fetch(`/api/notes/${noteId}?user_id=${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Błąd podczas aktualizacji notatki')
      }

      setEditingNoteId(null)
      onNoteUpdated()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (noteId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę notatkę?')) {
      return
    }

    try {
      const response = await fetch(`/api/notes/${noteId}?user_id=${user?.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Błąd podczas usuwania notatki')
      }

      onNoteDeleted()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    }
  }

  const getConnectionTypeLabel = (type: string) => {
    switch (type) {
      case 'primary': return 'Główne'
      case 'related': return 'Powiązane'
      case 'loose': return 'Luźne'
      default: return type
    }
  }

  const getConnectionTypeColor = (type: string) => {
    switch (type) {
      case 'primary': return 'bg-blue-100 text-blue-800'
      case 'related': return 'bg-green-100 text-green-800'
      case 'loose': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Brak notatek</h3>
        <p className="text-gray-500">Nie masz jeszcze żadnych notatek. Utwórz pierwszą!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {notes.map((note) => (
        <div key={note.id} className="bg-white rounded-lg shadow-md p-6">
          {editingNoteId === note.id ? (
            // Tryb edycji
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tytuł notatki *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Treść notatki *
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

                             {/* Wybór lekcji w trybie edycji */}
               {lessons.length > 0 && (
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Powiąż z lekcjami
                   </label>
                   
                   {/* Select box dla wyboru lekcji */}
                   <div className="space-y-3">
                     <select
                       value=""
                       onChange={(e) => {
                         const lessonId = e.target.value
                         if (lessonId && !editLessonIds.includes(lessonId)) {
                           handleLessonSelection(lessonId, true)
                         }
                       }}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     >
                       <option value="">-- Wybierz lekcję do dodania --</option>
                       {lessons
                         .filter(lesson => !editLessonIds.includes(lesson.id))
                         .map(lesson => (
                           <option key={lesson.id} value={lesson.id}>
                             {lesson.title}
                           </option>
                         ))
                       }
                     </select>
                     
                     {/* Lista wybranych lekcji */}
                     {editLessonIds.length > 0 && (
                       <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3">
                         {editLessonIds.map((lessonId, index) => {
                           const lesson = lessons.find(l => l.id === lessonId)
                           if (!lesson) return null
                           
                           return (
                             <div key={lessonId} className="flex items-center space-x-3 bg-gray-50 p-2 rounded">
                               <span className="flex-1 text-sm text-gray-700">
                                 {lesson.title}
                               </span>
                               
                               <select
                                 value={editConnectionTypes[index] || 'related'}
                                 onChange={(e) => handleConnectionTypeChange(lessonId, e.target.value as any)}
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
                                 ✕
                               </button>
                             </div>
                           )
                         })}
                       </div>
                     )}
                   </div>
                 </div>
               )}

              <div className="flex space-x-3">
                <button
                  onClick={() => handleUpdate(note.id)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isSubmitting ? 'Zapisuję...' : 'Zapisz'}
                </button>
                <button
                  onClick={cancelEditing}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Anuluj
                </button>
              </div>
            </div>
          ) : (
            // Tryb wyświetlania
            <div>
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-lg font-semibold text-gray-900">{note.title}</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={() => startEditing(note)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Edytuj
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Usuń
                  </button>
                </div>
              </div>

              <p className="text-gray-700 mb-4 whitespace-pre-wrap">{note.content}</p>

              {/* Powiązania z lekcjami */}
              {note.lesson_connections && note.lesson_connections.length > 0 ? (
                <div className="border-t pt-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Powiązane lekcje:</h5>
                  <div className="flex flex-wrap gap-2">
                    {note.lesson_connections.map((connection) => (
                      <span
                        key={connection.id}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConnectionTypeColor(connection.connection_type)}`}
                      >
                        {getConnectionTypeLabel(connection.connection_type)}: {connection.lesson_id}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border-t pt-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    📝 Luźna notatka
                  </span>
                </div>
              )}

              <div className="text-xs text-gray-500 mt-3">
                Utworzono: {new Date(note.created_at).toLocaleDateString('pl-PL')}
                {note.updated_at !== note.created_at && 
                  ` • Zaktualizowano: ${new Date(note.updated_at).toLocaleDateString('pl-PL')}`
                }
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
