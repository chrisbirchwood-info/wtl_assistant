'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

interface AddSurveyFormProps {
  teacherId: string
  onSurveyAdded: () => void
  onCancel: () => void
}

export default function AddSurveyForm({ teacherId, onSurveyAdded, onCancel }: AddSurveyFormProps) {
  const [surveyLink, setSurveyLink] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extractFormIdFromUrl = (urlString: string): string | null => {
    try {
      const url = new URL(urlString)
      const parts = url.pathname.split('/').filter(Boolean)
      const idx = parts.findIndex((p) => p === 'd')
      if (idx !== -1 && parts[idx + 1]) {
        const maybeE = parts[idx + 1]
        if (maybeE === 'e' && parts[idx + 2]) return parts[idx + 2]
        return parts[idx + 1]
      }
      return null
    } catch {
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!surveyLink.trim()) {
      setError('Link do ankiety jest wymagany')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const url = new URL(surveyLink.trim())
      const formId = extractFormIdFromUrl(surveyLink.trim())
      
      if (!formId) {
        throw new Error('Nie można wyodrębnić ID formularza z tego linku')
      }

      // Save directly to database
      const response = await fetch('/api/surveys/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: formId,
          teacher_id: teacherId,
          title: title.trim() || `Ankieta ${formId.substring(0, 8)}...`,
          description: description.trim() || `Dodano z linku: ${url.toString()}`,
          source_link: url.toString()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Błąd podczas zapisywania ankiety')
      }

      toast.success('Ankieta została dodana do bazy danych')
      onSurveyAdded()

    } catch (error: any) {
      setError(error.message || 'Nieprawidłowy adres URL')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">Dodaj nową ankietę</h3>
          <p className="text-sm text-gray-600 mt-1">
            Wprowadź link do ankiety Google Forms
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link do ankiety Google Forms *
            </label>
            <input
              type="url"
              value={surveyLink}
              onChange={(e) => setSurveyLink(e.target.value)}
              placeholder="https://docs.google.com/forms/d/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tytuł ankiety (opcjonalnie)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Zostanie pobrany automatycznie podczas synchronizacji"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opis (opcjonalnie)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dodatkowy opis ankiety"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !surveyLink.trim()}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Dodaję...' : 'Dodaj ankietę'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
