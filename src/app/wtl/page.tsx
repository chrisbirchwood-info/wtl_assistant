'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface ApiResponse<T> {
  success: boolean
  data: T
  source?: string
  message?: string
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
}

interface Task {
  id: string
  project_id: string
  title: string
  description?: string
  status: string
  priority: string
  due_date?: string
}

interface Lesson {
  id: string
  training_id: string
  name: string
  description?: string
  order: number
  duration?: string
  type: string
  status: string
}

export default function WTLPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [allLessons, setAllLessons] = useState<Lesson[]>([]) // Wszystkie lekcje z API
  const [lessons, setLessons] = useState<Lesson[]>([]) // Lekcje dla wybranego kursu
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lessonsLoading, setLessonsLoading] = useState(false)
  const [dataSource, setDataSource] = useState<string>('loading')
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [projectLessonsMap, setProjectLessonsMap] = useState<{[key: string]: Lesson[]}>({}) // Mapa lekcji per projekt

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      setLessonsLoading(true)
      fetchTasks(selectedProject)
      fetchLessons(selectedProject).finally(() => setLessonsLoading(false))
    } else {
      // Wyczyść zadania i lekcje gdy nie ma wybranego projektu
      setTasks([])
      setLessons([])
      setLessonsLoading(false)
    }
  }, [selectedProject])

  const fetchData = async () => {
    try {
      console.log('Fetching data from WTL API...')
      
      // Pobierz projekty i wszystkie lekcje na start
      const [projectsRes, lessonsRes] = await Promise.all([
        fetch('/api/wtl/projects'),
        fetch('/api/wtl/lessons') // Wszystkie lekcje
      ])

      const projectsData: ApiResponse<Project[]> = await projectsRes.json()
      const lessonsData: ApiResponse<Lesson[]> = await lessonsRes.json()

      if (projectsData.success) {
        setProjects(projectsData.data)
        setDataSource(projectsData.source || 'unknown')
        setStatusMessage(projectsData.message || '')
        
        if (projectsData.source === 'wtl') {
          toast.success('Projekty załadowane z Web To Learn API! 🎉')
        } else if (projectsData.source === 'supabase') {
          toast.success('Projekty załadowane z cache (Supabase)')
        } else {
          toast.success('Używane dane demonstracyjne projektów')
        }
      }

      if (lessonsData.success) {
        setAllLessons(lessonsData.data)
        
        // Stwórz mapę lekcji per projekt
        const lessonsMap: {[key: string]: Lesson[]} = {}
        
        // Inteligentne przypisanie lekcji do kursów
        lessonsData.data.forEach((lesson: any) => {
          let courseId = lesson.training_id || lesson.course_id || lesson.project_id
          
          // Jeśli nie ma bezpośredniego ID, spróbuj dopasować po nazwie
          if (!courseId) {
            const lessonName = lesson.name?.toLowerCase() || ''
            
            // Przypisz na podstawie poziomu - wszystkie A1, A2, B1, B2, C1 to Angielski XXI wieku
            if (lessonName.includes('a1.') || lessonName.includes('a2.') || 
                lessonName.includes('b1.') || lessonName.includes('b2.') || 
                lessonName.includes('c1.')) {
              courseId = '3' // Angielski XXI wieku
            } else if (lessonName.includes('przełam') || lessonName.includes('barierę')) {
              courseId = '2' // Przełam barierę językową w 5 tygodni
            } else {
              courseId = '1' // Przykładowe Szkolenie
            }
          }
          
          if (!lessonsMap[courseId]) {
            lessonsMap[courseId] = []
          }
          lessonsMap[courseId].push(lesson)
        })
        
        setProjectLessonsMap(lessonsMap)
        console.log('Created lessons map:', lessonsMap)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Błąd podczas ładowania danych')
      setDataSource('error')
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async (trainingId?: string) => {
    try {
      const url = trainingId ? `/api/wtl/tasks?trainingId=${trainingId}` : '/api/wtl/tasks'
      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setTasks(data.data)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const fetchLessons = async (trainingId?: string) => {
    try {
      if (!trainingId) {
        setLessons([])
        return
      }

      console.log('Filtering lessons for training:', trainingId)
      
      // Użyj mapy lekcji per projekt
      const projectLessons = projectLessonsMap[trainingId] || []
      setLessons(projectLessons)
      
      if (projectLessons.length > 0) {
        toast.success(`Załadowano ${projectLessons.length} lekcji z kursu! 📚`)
        console.log(`Filtered ${projectLessons.length} lessons for training ${trainingId}`)
      } else {
        console.log(`No lessons found for training ${trainingId}`)
        // Jeśli nie ma lekcji w mapie, spróbuj pobrać z API
        const url = `/api/wtl/lessons?trainingId=${trainingId}`
        const response = await fetch(url)
        const data: ApiResponse<Lesson[]> = await response.json()

        if (data.success && data.data.length > 0) {
          setLessons(data.data)
          toast.success(`Załadowano ${data.data.length} lekcji z API! 📚`)
        }
      }
    } catch (error) {
      console.error('Error filtering lessons:', error)
      toast.error('Błąd podczas filtrowania lekcji')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">WTL Dashboard</h1>
                <p className="text-gray-600 mt-2">
                  Zarządzaj projektami i zadaniami WTL
                </p>
                <div className={`mt-2 inline-block px-3 py-1 text-sm rounded-full ${
                  dataSource === 'wtl' 
                    ? 'bg-green-100 text-green-800' 
                    : dataSource === 'supabase'
                    ? 'bg-blue-100 text-blue-800'
                    : dataSource === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {dataSource === 'wtl' && '🌐 Połączono z Web To Learn API'}
                  {dataSource === 'supabase' && '💾 Dane z cache (Supabase)'}
                  {dataSource === 'mock' && '📋 Tryb demo - dane przykładowe'}
                  {dataSource === 'error' && '❌ Błąd połączenia'}
                  {dataSource === 'loading' && '⏳ Ładowanie...'}
                </div>
                {statusMessage && (
                  <p className="text-xs text-gray-500 mt-1">{statusMessage}</p>
                )}
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setLoading(true)
                    setDataSource('loading')
                    fetchData()
                  }}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading ? '⏳ Ładowanie...' : '🔄 Odśwież dane'}
                </button>
                <button 
                  onClick={() => toast.success('Funkcja w przygotowaniu')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  ➕ Nowy projekt
                </button>
              </div>
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">
                Łączna liczba projektów
              </h3>
              <p className="text-3xl font-bold mt-2 text-gray-900">{projects.length}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">
                Aktywne zadania
              </h3>
              <p className="text-3xl font-bold mt-2 text-gray-900">
                {tasks.filter(task => task.status === 'in_progress').length}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">
                Ukończone zadania
              </h3>
              <p className="text-3xl font-bold mt-2 text-gray-900">
                {tasks.filter(task => task.status === 'completed').length}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">
                {selectedProject ? 'Lekcje w kursie' : 'Lekcje łącznie'}
              </h3>
              <p className="text-3xl font-bold mt-2 text-blue-600">
                {lessons.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Projects Panel */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Kursy WTL</h2>
                <span className="text-sm text-gray-500">
                  {projects.length} kursów
                </span>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedProject === project.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedProject(project.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          project.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : project.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lessons Panel */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedProject ? 'Lekcje kursu' : 'Wybierz kurs'}
                </h2>
                <div className="flex items-center space-x-2">
                  {lessonsLoading && <LoadingSpinner size="sm" />}
                  {selectedProject && !lessonsLoading && (
                    <span className="text-sm text-gray-500">
                      {lessons.length} lekcji
                    </span>
                  )}
                </div>
              </div>
              
              {lessonsLoading ? (
                <div className="text-center py-8">
                  <LoadingSpinner size="md" />
                  <p className="text-gray-500 mt-4">Ładowanie lekcji kursu...</p>
                </div>
              ) : lessons.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {selectedProject 
                      ? 'Ten kurs nie ma jeszcze lekcji' 
                      : 'Kliknij na kurs aby zobaczyć jego lekcje'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              #{lesson.order}
                            </span>
                            <h4 className="font-medium text-gray-900">{lesson.name}</h4>
                          </div>
                          {lesson.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {lesson.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2">
                            {lesson.duration && (
                              <span className="text-xs text-gray-500">
                                ⏱️ {lesson.duration}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              📄 {lesson.type}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              lesson.status === 'published'
                                ? 'bg-green-100 text-green-800'
                                : lesson.status === 'draft'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {lesson.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>





          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Szybkie akcje</h2>
            <div className="flex flex-wrap gap-4">
              <button 
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => toast.success('Eksport danych rozpoczęty')}
              >
                📊 Eksportuj dane
              </button>
              <button 
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => toast.success('Raport został wygenerowany')}
              >
                📋 Generuj raport
              </button>
              <button 
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => toast.success('Backup utworzony')}
              >
                💾 Utwórz backup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
