"use client"

import { useState, useEffect, useRef } from 'react'
import { CreateThreadRequest as CreateNoteRequest, Lesson } from '@/types/threads'

interface CreateThreadFormProps {
  onThreadCreated: () => void
  lessons?: Lesson[]
  preselectedLessonId?: string
  user?: { id: string }
}

export default function CreateThreadForm({ onThreadCreated, lessons = [], preselectedLessonId, user }: CreateThreadFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>(preselectedLessonId ? [preselectedLessonId] : [])
  const [connectionTypes, setConnectionTypes] = useState<('primary' | 'related' | 'loose')[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lessonSearchTerm, setLessonSearchTerm] = useState('')
  const [showLessonDropdown, setShowLessonDropdown] = useState(false)
  const lessonDropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (preselectedLessonId) {
      setConnectionTypes(['primary'])
    }
  }, [preselectedLessonId])

  const handleLessonSelection = (lessonId: string, checked: boolean) => {
    if (checked) {
      setSelectedLessonIds(prev => [...prev, lessonId])
      setConnectionTypes(prev => [...prev, 'related'])
    } else {
      const index = selectedLessonIds.indexOf(lessonId)
      setSelectedLessonIds(prev => prev.filter(id => id !== lessonId))
      setConnectionTypes(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleConnectionTypeChange = (lessonId: string, newType: 'primary' | 'related' | 'loose') => {
    const index = selectedLessonIds.indexOf(lessonId)
    if (index !== -1) {
      const newTypes = [...connectionTypes]
      newTypes[index] = newType
      setConnectionTypes(newTypes)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      setError('Tytuł i treść są wymagane')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const noteData: CreateNoteRequest = {
        title: title.trim(),
        content: content.trim(),
        lesson_ids: selectedLessonIds.length > 0 ? selectedLessonIds : undefined,
        connection_types: selectedLessonIds.length > 0 ? connectionTypes : undefined,
      }

      const response = await fetch(`/api/threads?user_id=${user?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id || 'local'}`
        },
        body: JSON.stringify(noteData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Błąd podczas tworzenia wątku')
      }

      setSuccess('Wątek został utworzony pomyślnie!')
      setTitle('')
      setContent('')
      setSelectedLessonIds(preselectedLessonId ? [preselectedLessonId] : [])
      setConnectionTypes(preselectedLessonId ? ['primary'] : [])

      onThreadCreated()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLooseNote = selectedLessonIds.length === 0

  const filteredLessons = lessons.filter((lesson) => {
    const title = (lesson.title || '').toLowerCase()
    return !selectedLessonIds.includes(lesson.id) && title.includes(lessonSearchTerm.toLowerCase())
  })

  const handleLessonSelect = (lessonId: string) => {
    if (!selectedLessonIds.includes(lessonId)) {
      handleLessonSelection(lessonId, true)
      setLessonSearchTerm('')
      setShowLessonDropdown(false)
    }
  }

  useEffect(() => {
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!lessonDropdownRef.current) return
      const target = e.target as Node
      if (lessonDropdownRef.current.contains(target)) return
      setShowLessonDropdown(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [])

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tytuł wątku *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Wprowadź tytuł wątku..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Treść wątku *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="Wprowadź treść wątku..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Powiązania z lekcjami (opcjonalnie)</label>

          <div className="space-y-3" ref={lessonDropdownRef}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={lessonSearchTerm}
                onChange={(e) => {
                  setLessonSearchTerm(e.target.value)
                  setShowLessonDropdown(true)
                }}
                onFocus={() => setShowLessonDropdown(true)}
                placeholder="Wyszukaj lekcję po tytule..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {showLessonDropdown && lessonSearchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredLessons.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">Brak lekcji pasujących do wyszukiwania</div>
                  ) : (
                    filteredLessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => handleLessonSelect(lesson.id)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm"
                      >
                        <div className="font-medium text-gray-900">{lesson.title}</div>
                        {lesson.description && <div className="text-xs text-gray-500 truncate">{lesson.description}</div>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedLessonIds.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                {selectedLessonIds.map((lessonId, index) => {
                  const lesson = lessons.find((l) => l.id === lessonId)
                  if (!lesson) return null
                  return (
                    <div key={lessonId} className="flex items-center space-x-3 bg-gray-50 p-2 rounded">
                      <span className="flex-1 text-sm text-gray-700">{lesson.title}</span>
                      <select
                        value={connectionTypes[index] || 'related'}
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

          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>Wyszukaj lekcję po tytule, aby ją dodać</span>
            <span className="text-blue-600 font-medium">{filteredLessons.length} z {lessons.length} lekcji dostępnych</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-md p-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isLooseNote ? 'bg-gray-400' : 'bg-blue-500'}`} />
            <span className="text-sm text-gray-600">
              {isLooseNote ? '🧵 Luźny wątek (nie powiązany z żadną lekcją)' : `🔗 Wątek powiązany z ${selectedLessonIds.length} lekcją/lekcjami`}
            </span>
          </div>
        </div>

        {error && (<div className="bg-red-50 border border-red-200 rounded-md p-3"><p className="text-sm text-red-700">{error}</p></div>)}
        {success && (<div className="bg-green-50 border border-green-200 rounded-md p-3"><p className="text-sm text-green-700">{success}</p></div>)}

        <button type="submit" disabled={isSubmitting} className={`w-full px-4 py-2 rounded-md font-medium text-white ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'}`}>
          {isSubmitting ? (<><span className="animate-spin mr-2">⏳</span>Tworzę wątek...</>) : 'Utwórz wątek'}
        </button>
      </form>
    </div>
  )
}
