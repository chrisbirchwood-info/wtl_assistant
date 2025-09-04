'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import toast from 'react-hot-toast'

type SurveyItem = {
  id: string
  link: string
  addedAt: string
  syncedAt?: string | null
}

export default function TeacherSurveysConfigPage() {
  const router = useRouter()
  const params = useParams()
  const teacherId = params.teacherId as string
  const { user, isAuthenticated, initialize } = useAuthStore()

  const [surveys, setSurveys] = useState<SurveyItem[]>([])

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

  // Lista ankiet w localStorage (per nauczyciel)
  const lsListKey = useMemo(() => `teacher_${teacherId}_surveys`, [teacherId])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsListKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setSurveys(parsed)
      } else {
        // Migracja ze starego formatu (pojedyncze klucze)
        const link = localStorage.getItem(`teacher_${teacherId}_survey_link`)
        const added = localStorage.getItem(`teacher_${teacherId}_survey_added_at`)
        const synced = localStorage.getItem(`teacher_${teacherId}_survey_synced_at`)
        if (link && added) {
          const migrated: SurveyItem[] = [
            { id: String(Date.now()), link, addedAt: added, syncedAt: synced || null },
          ]
          localStorage.setItem(lsListKey, JSON.stringify(migrated))
          setSurveys(migrated)
          localStorage.removeItem(`teacher_${teacherId}_survey_link`)
          localStorage.removeItem(`teacher_${teacherId}_survey_added_at`)
          localStorage.removeItem(`teacher_${teacherId}_survey_synced_at`)
        }
      }
    } catch {}
  }, [lsListKey, teacherId])

  const saveSurveys = (items: SurveyItem[]) => {
    setSurveys(items)
    try {
      localStorage.setItem(lsListKey, JSON.stringify(items))
    } catch {}
  }

  const handleAddSurveyLink = () => {
    const input = window.prompt('Podaj link do ankiety (URL):')
    if (!input) return
    try {
      const url = new URL(input)
      const now = new Date().toISOString()
      const newItem: SurveyItem = {
        id: String(Date.now()),
        link: url.toString(),
        addedAt: now,
        syncedAt: null,
      }
      saveSurveys([...(surveys || []), newItem])
      toast.success('Dodano ankietę')
    } catch {
      toast.error('Nieprawidłowy adres URL')
    }
  }

  const handleRefreshSurvey = (id: string) => {
    const now = new Date().toISOString()
    const next = (surveys || []).map((s: SurveyItem) => (s.id === id ? { ...s, syncedAt: now } : s))
    saveSurveys(next)
    toast.success('Zsynchronizowano ankietę')
  }

  const handleRemoveSurvey = (id: string) => {
    const next = (surveys || []).filter((s: SurveyItem) => s.id !== id)
    saveSurveys(next)
    toast('Usunięto ankietę', { icon: '🗑️' })
  }

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
      } else if (params.get('google') === 'error') {
        toast.error('Błąd łączenia z Google: ' + (params.get('message') || ''))
      }
    } catch {}
  }, [])

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

  const handleGoogleSyncSurvey = async (id: string) => {
    try {
      const target = surveys.find((s) => s.id === id)
      if (!target) return
      const res = await fetch('/api/surveys/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, link: target.link }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Błąd synchronizacji')
      }
      const data = await res.json()
      const now = data.syncedAt || new Date().toISOString()
      const next = (surveys || []).map((s: SurveyItem) => (s.id === id ? { ...s, syncedAt: now } : s))
      saveSurveys(next)
      toast.success(`Zsynchronizowano odpowiedzi (${data.count || 0})`)
    } catch (e: any) {
      toast.error(e.message || 'Nie udało się zsynchronizować')
    }
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
              <span className="mr-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.6 4.4-5.35 4.4-3.25 0-5.9-2.7-5.9-6s2.65-6 5.9-6c1.85 0 3.1.8 3.8 1.5l2.6-2.5C17.3 3.4 15.05 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 11.6S6.9 20.8 12 20.8c6.95 0 9.2-4.85 9.2-7.3 0-.5-.05-1-.15-1.4z" fill="#4285F4"/>
                </svg>
              </span>
              Połącz z Google
            </button>
          </div>
        </div>

        <div className="mb-4">
          <a
            href={`/api/surveys/google/authorize?teacherId=${teacherId}&returnTo=${encodeURIComponent('/teacher/' + teacherId + '/surveys')}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Połącz z Google (OAuth)
          </a>
        </div>

        <div className="bg-white shadow rounded-lg p-6 text-gray-500">
          Tutaj w przyszłości: mapowanie ankiet na kursy, wysyłka przypomnień itd.
        </div>

        {/* Lista ankiet na dole */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Twoje ankiety</h2>
          {surveys.length === 0 ? (
            <div className="bg-white shadow rounded-md p-6 text-gray-600">
              Brak dodanych ankiet. Użyj przycisku „Dodaj ankietę” u góry.
            </div>
          ) : (
            <div className="space-y-3">
              {surveys.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2 shadow-sm">
                  <div className="text-sm">
                    <div className="text-gray-800 truncate max-w-[680px]">
                      <a href={s.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {s.link}
                      </a>
                    </div>
                    <div className="text-gray-500">Dodano: {formatDate(s.addedAt)}</div>
                    <div className="text-gray-500">Ostatnia synchronizacja: {formatDate(s.syncedAt)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGoogleSyncSurvey(s.id)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      title="Odśwież"
                    >
                      Odśwież
                    </button>
                    <button
                      onClick={() => handleRemoveSurvey(s.id)}
                      className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                      title="Usuń"
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
    </div>
  )
}
