'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { SurveyForm, ThreadSurveyData } from '@/types/threads'

interface ThreadSurveyLinkerProps {
  threadId: string
  teacherId: string
  studentEmail?: string
  onLinked?: (result: any) => void
  existingConnections?: ThreadSurveyData[]
}

export default function ThreadSurveyLinker({
  threadId,
  teacherId,
  studentEmail,
  onLinked,
  existingConnections = []
}: ThreadSurveyLinkerProps) {
  const [availableForms, setAvailableForms] = useState<SurveyForm[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFormId, setSelectedFormId] = useState<string>('')
  const [showLinker, setShowLinker] = useState(false)

  // Get form IDs that are already connected
  const connectedFormIds = new Set(existingConnections.map(conn => conn.form_id))

  const fetchAvailableForms = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/surveys/forms?teacher_id=${teacherId}`)
      const data = await response.json()
      
      if (response.ok) {
        setAvailableForms(data.forms || [])
      } else {
        throw new Error(data.error || 'Błąd podczas pobierania ankiet')
      }
    } catch (error: any) {
      console.error('Error fetching forms:', error)
      toast.error(error.message || 'Błąd podczas pobierania ankiet')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (showLinker) {
      fetchAvailableForms()
    }
  }, [showLinker])

  const handleLinkToForm = async () => {
    if (!selectedFormId) {
      toast.error('Wybierz ankietę')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/threads/survey-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          form_id: selectedFormId,
          teacher_id: teacherId
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Błąd podczas łączenia')
      }
      
      const hasResponse = data.result?.has_response
      toast.success(
        hasResponse 
          ? 'Wątek połączony z ankietą - znaleziono odpowiedź ucznia!'
          : 'Wątek połączony z ankietą - oczekuje na odpowiedź ucznia'
      )
      
      setShowLinker(false)
      setSelectedFormId('')
      
      if (onLinked) {
        onLinked(data.result)
      }
    } catch (error: any) {
      console.error('Error linking to form:', error)
      toast.error(error.message || 'Błąd podczas łączenia z ankietą')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncConnections = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/threads/survey-connections/sync', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Błąd podczas synchronizacji')
      }
      
      toast.success(`Zsynchronizowano ${data.updated_connections} połączeń`)
      
      if (onLinked) {
        onLinked(data)
      }
    } catch (error: any) {
      console.error('Error syncing connections:', error)
      toast.error(error.message || 'Błąd podczas synchronizacji')
    } finally {
      setLoading(false)
    }
  }

  const getConnectionStatus = (connection: ThreadSurveyData) => {
    switch (connection.connection_type) {
      case 'responded':
        return {
          label: 'Odpowiedziano',
          color: 'bg-green-100 text-green-800',
          icon: '✅'
        }
      case 'waiting':
        return {
          label: 'Oczekuje na odpowiedź',
          color: 'bg-yellow-100 text-yellow-800',
          icon: '⏳'
        }
      case 'manual':
        return {
          label: 'Ręcznie połączone',
          color: 'bg-blue-100 text-blue-800',
          icon: '🔗'
        }
      default:
        return {
          label: 'Nieznany',
          color: 'bg-gray-100 text-gray-800',
          icon: '❓'
        }
    }
  }

  return (
    <div className="space-y-4">
      {/* Existing connections */}
      {existingConnections.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Połączone ankiety</h4>
          <div className="space-y-4">
            {existingConnections.map((connection) => {
              const status = getConnectionStatus(connection)
              return (
                <div key={connection.connection_id} className="bg-white p-4 rounded border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm">{connection.form_title || `Ankieta ${connection.form_id}`}</p>
                      <p className="text-xs text-gray-500">
                        Połączono: {new Date(connection.created_at).toLocaleString('pl-PL')}
                        {connection.synced_at && (
                          <span> • Zsynchronizowano: {new Date(connection.synced_at).toLocaleString('pl-PL')}</span>
                        )}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                      {status.icon} {status.label}
                    </span>
                  </div>
                  
                  {/* Show survey answers if responded */}
                  {connection.connection_type === 'responded' && connection.answers && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Odpowiedzi z ankiety:</h5>
                      <div className="space-y-2">
                        {connection.answers.map((answer: any, index: number) => (
                          <div key={answer.question_id || index} className="bg-gray-50 p-3 rounded">
                            <p className="text-sm font-medium text-gray-900">
                              {answer.question_text || `Pytanie ${answer.question_id}`}
                            </p>
                            <p className="text-sm text-gray-700 mt-1">
                              {answer.answer_text || JSON.stringify(answer.answer_value)}
                            </p>
                          </div>
                        ))}
                      </div>
                      
                      {connection.submitted_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          Odpowiedziano: {new Date(connection.submitted_at).toLocaleString('pl-PL')}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Show waiting message */}
                  {connection.connection_type === 'waiting' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        Oczekuje na odpowiedź ucznia. Użyj przycisku &quot;Synchronizuj odpowiedzi&quot; aby sprawdzić czy uczeń już odpowiedział.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setShowLinker(!showLinker)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.1m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          {showLinker ? 'Anuluj' : 'Połącz z ankietą'}
        </button>
        
        {existingConnections.some(conn => conn.connection_type === 'waiting') && (
          <button
            onClick={handleSyncConnections}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Synchronizuję...' : 'Synchronizuj odpowiedzi'}
          </button>
        )}
      </div>

      {/* Form selector */}
      {showLinker && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Wybierz ankietę do połączenia</h4>
          
          {studentEmail && (
            <div className="mb-3 text-sm text-gray-600">
              <span className="font-medium">Uczeń:</span> {studentEmail}
              <br />
              <span className="text-xs">System sprawdzi czy ten uczeń już odpowiedział na wybraną ankietę</span>
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-4">
              <div className="text-gray-600">Ładowanie ankiet...</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dostępne ankiety
                </label>
                <select
                  value={selectedFormId}
                  onChange={(e) => setSelectedFormId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Wybierz ankietę...</option>
                  {availableForms
                    .filter(form => !connectedFormIds.has(form.form_id))
                    .map((form) => (
                      <option key={form.form_id} value={form.form_id}>
                        {form.title || `Ankieta ${form.form_id}`}
                      </option>
                    ))}
                </select>
                {availableForms.filter(form => !connectedFormIds.has(form.form_id)).length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Wszystkie ankiety są już połączone z tym wątkiem
                  </p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowLinker(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleLinkToForm}
                  disabled={!selectedFormId || loading}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Łączę...' : 'Połącz'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
