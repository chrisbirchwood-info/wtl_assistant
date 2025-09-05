'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import AddSurveyForm from '@/components/surveys/AddSurveyForm'
import toast from 'react-hot-toast'

type DbForm = {
  form_id: string
  title?: string | null
  description?: string | null
  created_at?: string | null
  updated_at?: string | null
  last_synced_at?: string | null
  total_responses?: number | null
}

export default function TeacherSurveysConfigPage() {
  const router = useRouter()
  const params = useParams()
  const teacherId = params.teacherId as string
  const { user, isAuthenticated, initialize } = useAuthStore()

  const [dbForms, setDbForms] = useState<DbForm[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!isAuthenticated || !user) return
    // Dostęp: nauczyciel do własnej strony, superadmin do każdej
    if (user.role === 'teacher' && user.id !== teacherId) {
      router.push(`/teacher/${user.id}/surveys`)
    }
  }, [isAuthenticated, user, teacherId, router])

  const fetchSurveysFromDatabase = async () => {
    try {
      const response = await fetch(`/api/surveys/forms?teacher_id=${teacherId}`)
      const data = await response.json()
      if (response.ok) {
        setDbForms(data.forms || [])
      }
    } catch (error) {
      console.error('Error fetching surveys from database:', error)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSurveysFromDatabase()
      // Check Google OAuth status
      setGoogleConnected(null)
      fetch(`/api/surveys/google/status?teacher_id=${teacherId}`)
        .then((r) => r.json())
        .then((d) => setGoogleConnected(!!d.connected))
        .catch(() => setGoogleConnected(null))
    }
  }, [isAuthenticated, user, teacherId])

  const handleAddSurveyLink = () => setShowAddForm(true)

  const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('pl-PL') : '-')

  // Info o wyniku OAuth po powrocie z Google
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('google') === 'connected') {
        toast.success('Połączono z Google')
        params.delete('google')
        const url = `${window.location.pathname}`
        window.history.replaceState({}, '', url)
        setGoogleConnected(true)
      } else if (params.get('google') === 'error') {
        toast.error('Błąd łączenia z Google: ' + (params.get('message') || ''))
        setGoogleConnected(false)
      }
    } catch {}
  }, [])

  // Synchronizacja ankiet zapisanych w bazie (po formId)
  const handleGoogleSyncDbForm = async (formId: string) => {
    try {
      const res = await fetch('/api/surveys/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, formId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Błąd synchronizacji')
      }
      const data = await res.json()
      toast.success(`Zsynchronizowano odpowiedzi (${data.count || 0})`)
      fetchSurveysFromDatabase()
    } catch (e: any) {
      toast.error(e.message || 'Nie udało się zsynchronizować')
    }
  }

  const handleDeleteDbForm = async (formId: string) => {
    try {
      if (!confirm('Na pewno usunąć tę ankietę oraz wszystkie jej dane i powiązania?')) return
      const res = await fetch(`/api/surveys/forms?teacher_id=${teacherId}&form_id=${encodeURIComponent(formId)}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Nie udało się usunąć ankiety')
      toast.success('Usunięto ankietę i powiązane dane')
      fetchSurveysFromDatabase()
    } catch (e: any) {
      toast.error(e.message || 'Błąd podczas usuwania ankiety')
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Ładowanie...</div>
      </div>
    )
  }

  if (user.role !== 'teacher' && user.role !== 'superadmin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Brak dostępu</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Konfiguracja ankiet</h1>
            <p className="mt-2 text-gray-600">Tu nauczyciel konfiguruje ankiety dla swoich kursów.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddSurveyLink}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Dodaj ankietę
            </button>

            {/* Google OAuth button */}
            <button
              onClick={() => {
                window.location.href = `/api/surveys/google/authorize?teacherId=${teacherId}&returnTo=${encodeURIComponent(window.location.href)}`
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="mr-2 inline-flex items-center">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.6 4.4-5.35 4.4-3.25 0-5.9-2.7-5.9-6s2.65-6 5.9-6c1.85 0 3.1.8 3.8 1.5l2.6-2.5C17.3 3.4 15.05 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 11.6S6.9 20.8 12 20.8c6.95 0 9.2-4.85 9.2-7.3 0-.5-.05-1-.15-1.4z" fill="#4285F4"/>
                </svg>
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    googleConnected === null
                      ? 'bg-yellow-400 animate-pulse'
                      : googleConnected
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                  title={
                    googleConnected === null
                      ? 'Sprawdzam status połączenia z Google...'
                      : googleConnected
                      ? 'Połączono z Google'
                      : 'Brak połączenia z Google'
                  }
                />
              </span>
              {googleConnected ? 'Połączono z Google' : 'Połącz z Google'}
            </button>
          </div>
        </div>


        <div className="bg-white shadow rounded-lg p-6 text-gray-500">
          Tutaj w przyszłości: mapowanie ankiet na kursy, wysyłka przypomnień itd.
        </div>

        {/* Lista ankiet z bazy danych */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Ankiety w bazie</h2>
          {dbForms.length === 0 ? (
            <div className="bg-white shadow rounded-md p-6 text-gray-600">
              Brak ankiet w bazie dla tego nauczyciela.
            </div>
          ) : (
            <div className="space-y-3">
              {dbForms.map((f) => (
                <div key={f.form_id} className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2 shadow-sm">
                  <div className="text-sm">
                    <div className="text-gray-900 font-medium truncate max-w-[680px]">
                      {f.title || `Ankieta ${f.form_id.substring(0, 8)}...`}
                    </div>
                    <div className="text-gray-500">ID formularza: {f.form_id}</div>
                    <div className="text-gray-500">Utworzono: {formatDate(f.created_at || undefined)}</div>
                    <div className="text-gray-500">Ostatnia synchronizacja: {formatDate(f.last_synced_at || undefined)}</div>
                    {typeof f.total_responses === 'number' && (
                      <div className="text-gray-500">Liczba odpowiedzi: {f.total_responses}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://docs.google.com/forms/d/e/${f.form_id}/viewform`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-gray-50"
                    >
                      Otwórz formularz
                    </a>
                    <button
                      onClick={() => handleGoogleSyncDbForm(f.form_id)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      title="Odśwież odpowiedzi"
                    >
                      Odśwież
                    </button>
                    <button
                      onClick={() => handleDeleteDbForm(f.form_id)}
                      className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                      title="Usuń ankietę"
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Survey Form Dialog */}
      {showAddForm && (
        <AddSurveyForm
          teacherId={teacherId}
          onSurveyAdded={() => {
            setShowAddForm(false)
            fetchSurveysFromDatabase()
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  )
}
