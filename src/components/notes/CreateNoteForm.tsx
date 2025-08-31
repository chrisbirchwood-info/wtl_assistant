'use client'

import { useState, useEffect } from 'react'
import { CreateNoteRequest, Lesson } from '@/types/notes'

interface CreateNoteFormProps {
  onNoteCreated: () => void
  lessons?: Lesson[]
  preselectedLessonId?: string
  user?: { id: string }
}

export default function CreateNoteForm({ onNoteCreated, lessons = [], preselectedLessonId, user }: CreateNoteFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>(preselectedLessonId ? [preselectedLessonId] : [])
  const [connectionTypes, setConnectionTypes] = useState<('primary' | 'related' | 'loose')[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lessonSearchTerm, setLessonSearchTerm] = useState('')
  const [showLessonDropdown, setShowLessonDropdown] = useState(false)

  useEffect(() => {
    // Inicjalizuj typy połączeń dla wybranych lekcji
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
        connection_types: selectedLessonIds.length > 0 ? connectionTypes : undefined
      }

      const response = await fetch(`/api/notes?user_id=${user?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Błąd podczas tworzenia notatki')
      }

      const result = await response.json()
      
      setSuccess('Notatka została utworzona pomyślnie!')
      setTitle('')
      setContent('')
      setSelectedLessonIds(preselectedLessonId ? [preselectedLessonId] : [])
      setConnectionTypes(preselectedLessonId ? ['primary'] : [])
      
      // Wywołaj callback
      onNoteCreated()
      
      // Ukryj komunikat sukcesu po 3 sekundach
      setTimeout(() => setSuccess(null), 3000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLooseNote = selectedLessonIds.length === 0

  // Filtruj lekcje na podstawie wyszukiwania
  const filteredLessons = lessons.filter(lesson => 
    !selectedLessonIds.includes(lesson.id) && 
    lesson.title.toLowerCase().includes(lessonSearchTerm.toLowerCase())
  )

  const handleLessonSelect = (lessonId: string) => {
    if (!selectedLessonIds.includes(lessonId)) {
      handleLessonSelection(lessonId, true)
      setLessonSearchTerm('')
      setShowLessonDropdown(false)
    }
  }

  // Zamknij dropdown po kliknięciu poza nim
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showLessonDropdown) {
        setShowLessonDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showLessonDropdown])

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {preselectedLessonId ? 'Dodaj notatkę do lekcji' : 'Utwórz nową notatkę'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tytuł */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Tytuł notatki *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Wprowadź tytuł notatki..."
            required
          />
        </div>

        {/* Treść */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Treść notatki *
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Wprowadź treść notatki..."
            required
          />
        </div>

        {/* Wybór lekcji */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Powiąż z lekcjami (opcjonalnie) - {lessons.length} dostępnych lekcji
            {lessons.length > 0 && (
              <span className="ml-2 text-xs text-blue-600 font-normal">
                (ID: {lessons[0]?.id?.substring(0, 8)}... - {lessons[lessons.length-1]?.id?.substring(0, 8)}...)
              </span>
            )}
          </label>
          
          {lessons.length === 0 ? (
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
              Brak dostępnych lekcji w tym kursie. Możesz utworzyć luźną notatkę.
            </div>
          ) : (
            <>
            {/* Dynamiczny search dla wyboru lekcji */}
            <div className="space-y-3">
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
                  placeholder="🔍 Wyszukaj lekcję po tytule..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                {/* Dropdown z wynikami wyszukiwania */}
                {showLessonDropdown && lessonSearchTerm && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredLessons.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        Brak lekcji pasujących do wyszukiwania
                      </div>
                    ) : (
                      filteredLessons.map(lesson => (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => handleLessonSelect(lesson.id)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm"
                        >
                          <div className="font-medium text-gray-900">{lesson.title}</div>
                          {lesson.description && (
                            <div className="text-xs text-gray-500 truncate">{lesson.description}</div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              {/* Lista wybranych lekcji */}
              {selectedLessonIds.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {selectedLessonIds.map((lessonId, index) => {
                    const lesson = lessons.find(l => l.id === lessonId)
                    if (!lesson) return null
                    
                    return (
                      <div key={lessonId} className="flex items-center space-x-3 bg-gray-50 p-2 rounded">
                        <span className="flex-1 text-sm text-gray-700">
                          {lesson.title}
                        </span>
                        
                        <select
                          value={connectionTypes[index] || 'related'}
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
            
            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
              <span>🔍 Wyszukaj lekcję po tytule, aby ją dodać</span>
              <span className="text-blue-600 font-medium">
                {filteredLessons.length} z {lessons.length} lekcji dostępnych
              </span>
            </div>
          </>
          )}
        </div>

        {/* Informacja o typie notatki */}
        <div className="bg-gray-50 rounded-md p-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isLooseNote ? 'bg-gray-400' : 'bg-blue-500'
            }`} />
            <span className="text-sm text-gray-600">
              {isLooseNote 
                ? '📝 Luźna notatka (nie powiązana z żadną lekcją)'
                : `🔗 Notatka powiązana z ${selectedLessonIds.length} lekcją/lekcjami`
              }
            </span>
          </div>
        </div>

        {/* Komunikaty */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Przycisk submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full px-4 py-2 rounded-md font-medium text-white ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }`}
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin mr-2">⟳</span>
              Tworzę notatkę...
            </>
          ) : (
            'Utwórz notatkę'
          )}
        </button>
      </form>
    </div>
  )
}
