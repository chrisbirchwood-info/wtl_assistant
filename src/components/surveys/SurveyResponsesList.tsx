'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'

interface SurveyAnswer {
  id: string
  question_id: string
  question_text?: string
  question_type?: string
  answer_text?: string
  answer_value?: any
}

interface SurveyForm {
  form_id: string
  title?: string
  teacher_id: string
}

interface Student {
  id: string
  email: string
  first_name?: string
  last_name?: string
}

interface LinkedThread {
  id: string
  title: string
  user_id: string
}

interface SurveyResponse {
  id: string
  response_id: string
  form_id: string
  respondent_email?: string
  submitted_at?: string
  created_at: string
  survey_forms: SurveyForm
  survey_answers: SurveyAnswer[]
  student?: Student
  is_linked: boolean
  linked_thread?: LinkedThread
}

interface SurveyResponsesListProps {
  teacherId: string
  formId?: string
  onCreateThread?: (responseId: string) => void
  onLinkToThread?: (responseId: string) => void
  showLinked?: boolean
}

export default function SurveyResponsesList({
  teacherId,
  formId,
  onCreateThread,
  onLinkToThread,
  showLinked = false
}: SurveyResponsesListProps) {
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [responsesByForm, setResponsesByForm] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const fetchResponses = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        teacher_id: teacherId,
        include_linked: showLinked.toString()
      })
      
      if (formId) {
        params.append('form_id', formId)
      }
      
      const response = await fetch(`/api/surveys/responses?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Błąd podczas pobierania odpowiedzi')
      }
      
      setResponses(data.responses || [])
      setResponsesByForm(data.by_form || {})
    } catch (error: any) {
      console.error('Error fetching survey responses:', error)
      toast.error(error.message || 'Błąd podczas pobierania odpowiedzi z ankiet')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResponses()
  }, [teacherId, formId, showLinked])

  const handleCreateThread = async (responseId: string) => {
    try {
      const response = await fetch('/api/threads/survey-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_response_id: responseId,
          teacher_id: teacherId
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Błąd podczas tworzenia wątku')
      }
      
      toast.success('Wątek został utworzony i połączony z odpowiedzią z ankiety')
      fetchResponses() // Refresh the list
      
      if (onCreateThread) {
        onCreateThread(responseId)
      }
    } catch (error: any) {
      console.error('Error creating thread:', error)
      toast.error(error.message || 'Błąd podczas tworzenia wątku')
    }
  }

  const handleViewDetails = async (response: SurveyResponse) => {
    try {
      const res = await fetch('/api/surveys/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_id: response.id,
          teacher_id: teacherId
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Błąd podczas pobierania szczegółów')
      }
      
      setSelectedResponse(data.response)
      setShowDetails(true)
    } catch (error: any) {
      console.error('Error fetching response details:', error)
      toast.error(error.message || 'Błąd podczas pobierania szczegółów odpowiedzi')
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('pl-PL')
  }

  const getStudentName = (student?: Student) => {
    if (!student) return 'Nieznany użytkownik'
    if (student.first_name && student.last_name) {
      return `${student.first_name} ${student.last_name}`
    }
    return student.email
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Ładowanie odpowiedzi z ankiet...</div>
      </div>
    )
  }

  if (responses.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <p className="text-gray-600">
          {showLinked 
            ? 'Brak odpowiedzi z ankiet'
            : 'Brak niepołączonych odpowiedzi z ankiet'
          }
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(responsesByForm).map(([fId, formData]) => (
        <div key={fId} className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {formData.form.title || `Ankieta ${fId}`}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {formData.responses.length} odpowiedzi
            </p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {formData.responses.map((response: SurveyResponse) => (
              <div key={response.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {getStudentName(response.student)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {response.respondent_email}
                        </p>
                        <p className="text-xs text-gray-400">
                          Wysłano: {formatDate(response.submitted_at)}
                        </p>
                      </div>
                      
                      {response.is_linked && (
                        <div className="flex items-center space-x-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Połączone
                          </span>
                          {response.linked_thread && (
                            <span className="text-xs text-gray-500">
                              → {response.linked_thread.title}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewDetails(response)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Zobacz szczegóły
                    </button>
                    
                    {!response.is_linked && (
                      <>
                        <button
                          onClick={() => handleCreateThread(response.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Utwórz wątek
                        </button>
                        
                        {onLinkToThread && (
                          <button
                            onClick={() => onLinkToThread(response.id)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Połącz z wątkiem
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {/* Details Modal */}
      {showDetails && selectedResponse && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Szczegóły odpowiedzi z ankiety
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Informacje o odpowiedzi</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Uczeń:</span>
                    <span className="ml-2 font-medium">{getStudentName(selectedResponse.student)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2">{selectedResponse.respondent_email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Data wysłania:</span>
                    <span className="ml-2">{formatDate(selectedResponse.submitted_at)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Ankieta:</span>
                    <span className="ml-2">{selectedResponse.survey_forms.title}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Odpowiedzi</h4>
                <div className="space-y-3">
                  {selectedResponse.survey_answers.map((answer) => (
                    <div key={answer.id} className="border-l-4 border-indigo-500 pl-4">
                      <p className="font-medium text-gray-900 text-sm">
                        {answer.question_text || `Pytanie ${answer.question_id}`}
                      </p>
                      <p className="text-gray-700 mt-1">
                        {answer.answer_text || JSON.stringify(answer.answer_value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedResponse.is_linked && selectedResponse.linked_thread && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Połączony wątek</h4>
                  <p className="text-green-700">{selectedResponse.linked_thread.title}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
