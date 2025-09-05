'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import SurveyResponsesList from '@/components/surveys/SurveyResponsesList'
import { toast } from 'react-hot-toast'

export default function SurveyThreadsPage() {
  const router = useRouter()
  const params = useParams()
  const teacherId = params.teacherId as string
  const { user, isAuthenticated, initialize } = useAuthStore()
  
  const [activeTab, setActiveTab] = useState<'unlinked' | 'linked'>('unlinked')
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [selectedResponseId, setSelectedResponseId] = useState<string>('')
  const [availableThreads, setAvailableThreads] = useState<any[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string>('')

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!isAuthenticated || !user) return
    
    // Check access permissions
    if (user.role === 'teacher' && user.id !== teacherId) {
      router.push(`/teacher/${user.id}/survey-threads`)
    } else if (user.role === 'student') {
      router.push('/profile')
    }
  }, [isAuthenticated, user, teacherId, router])

  const fetchAvailableThreads = async () => {
    try {
      const response = await fetch(`/api/threads?user_id=${teacherId}&include_loose=true`)
      const data = await response.json()
      
      if (response.ok) {
        // Filter threads that don't already have survey connections
        const threadsWithoutSurveys = data.threads?.filter((thread: any) => 
          !thread.survey_connections || thread.survey_connections.length === 0
        ) || []
        
        setAvailableThreads(threadsWithoutSurveys)
      }
    } catch (error) {
      console.error('Error fetching threads:', error)
    }
  }

  const handleLinkToThread = (responseId: string) => {
    setSelectedResponseId(responseId)
    fetchAvailableThreads()
    setShowLinkModal(true)
  }

  const handleConfirmLink = async () => {
    if (!selectedResponseId || !selectedThreadId) {
      toast.error('Wybierz wątek do połączenia')
      return
    }

    try {
      const response = await fetch('/api/threads/survey-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: selectedThreadId,
          survey_response_id: selectedResponseId,
          connection_type: 'manual'
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Błąd podczas łączenia')
      }
      
      toast.success('Odpowiedź z ankiety została połączona z wątkiem')
      setShowLinkModal(false)
      setSelectedResponseId('')
      setSelectedThreadId('')
    } catch (error: any) {
      console.error('Error linking survey to thread:', error)
      toast.error(error.message || 'Błąd podczas łączenia z wątkiem')
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
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Brak dostępu</h1>
          <p className="text-gray-600">Ta strona jest dostępna tylko dla nauczycieli.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Wątki z ankiet
              </h1>
              <p className="mt-2 text-gray-600">
                Zarządzaj połączeniami między odpowiedziami z ankiet a wątkami uczniów
              </p>
            </div>
            
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Wróć
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('unlinked')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'unlinked'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Niepołączone odpowiedzi
              </button>
              <button
                onClick={() => setActiveTab('linked')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'linked'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Połączone odpowiedzi
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'unlinked' && (
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Odpowiedzi z ankiet, które nie zostały jeszcze połączone z wątkami uczniów.
                  Możesz utworzyć nowy wątek lub połączyć z istniejącym.
                </p>
              </div>
              
              <SurveyResponsesList
                teacherId={teacherId}
                showLinked={false}
                onLinkToThread={handleLinkToThread}
              />
            </div>
          )}

          {activeTab === 'linked' && (
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Odpowiedzi z ankiet, które zostały już połączone z wątkami uczniów.
                </p>
              </div>
              
              <SurveyResponsesList
                teacherId={teacherId}
                showLinked={true}
              />
            </div>
          )}
        </div>

        {/* Link to Thread Modal */}
        {showLinkModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Połącz z wątkiem
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Wybierz istniejący wątek do połączenia z odpowiedzią z ankiety.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dostępne wątki
                </label>
                {availableThreads.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    Brak dostępnych wątków do połączenia
                  </p>
                ) : (
                  <select
                    value={selectedThreadId}
                    onChange={(e) => setSelectedThreadId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Wybierz wątek...</option>
                    {availableThreads.map((thread) => (
                      <option key={thread.id} value={thread.id}>
                        {thread.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowLinkModal(false)
                    setSelectedResponseId('')
                    setSelectedThreadId('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleConfirmLink}
                  disabled={!selectedThreadId}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Połącz
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
