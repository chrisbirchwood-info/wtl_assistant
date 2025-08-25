'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { createClient } from '@supabase/supabase-js'

interface StudentProfile {
  id: string
  user_id: string
  current_course_id?: string
  progress_percentage: number
  enrollment_date: string
  created_at: string
  updated_at: string
}

interface TeacherProfile {
  id: string
  user_id: string
  specialization?: string
  experience_years?: number
  bio?: string
  created_at: string
  updated_at: string
}

export default function UserProfile() {
  const { user, isAuthenticated } = useAuthStore()
  const [profile, setProfile] = useState<StudentProfile | TeacherProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    username: '',
    specialization: '',
    experience_years: 0,
    bio: ''
  })

  useEffect(() => {
    if (!user || !isAuthenticated) {
      setError('Brak sesji użytkownika')
      setIsLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Pobierz dane użytkownika
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single()

        if (userError) {
          throw new Error(`Błąd pobierania użytkownika: ${userError.message}`)
        }

        if (!userData) {
          throw new Error('Użytkownik nie został znaleziony')
        }

        // Pobierz profil w zależności od roli
        if (userData.role === 'teacher') {
          const { data: teacherProfile, error: profileError } = await supabase
            .from('teacher_profiles')
            .select('*')
            .eq('user_id', userData.id)
            .single()

          if (profileError && profileError.code !== 'PGRST116') {
            throw new Error(`Błąd pobierania profilu nauczyciela: ${profileError.message}`)
          }

          setProfile(teacherProfile)
        } else {
          const { data: studentProfile, error: profileError } = await supabase
            .from('student_profiles')
            .select('*')
            .eq('user_id', userData.id)
            .single()

          if (profileError && profileError.code !== 'PGRST116') {
            throw new Error(`Błąd pobierania profilu kursanta: ${profileError.message}`)
          }

          setProfile(studentProfile)
        }

        // Inicjalizuj dane edycji
        setEditData({
          username: userData.username || '',
          specialization: userData.role === 'teacher' && profile ? (profile as TeacherProfile).specialization || '' : '',
          experience_years: userData.role === 'teacher' && profile ? (profile as TeacherProfile).experience_years || 0 : 0,
          bio: userData.role === 'teacher' && profile ? (profile as TeacherProfile).bio || '' : ''
        })

      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [user, isAuthenticated])

  const handleSave = async () => {
    try {
      if (!user) return

      // Aktualizuj dane użytkownika
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error: userError } = await supabase
        .from('users')
        .update({ 
          username: editData.username,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (userError) throw userError

      // Aktualizuj profil odpowiedni dla roli
      if (user.role === 'teacher' && profile) {
        const { error: profileError } = await supabase
          .from('teacher_profiles')
          .upsert({
            user_id: user.id,
            specialization: editData.specialization,
            experience_years: editData.experience_years,
            bio: editData.bio,
            updated_at: new Date().toISOString()
          })

        if (profileError) throw profileError
      }

      // Odśwież dane
      const { data: userData, error: fetchUserError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single()

      if (fetchUserError) throw fetchUserError

      if (userData.role === 'teacher') {
        const { data: teacherProfile, error: profileError } = await supabase
          .from('teacher_profiles')
          .select('*')
          .eq('user_id', userData.id)
          .single()
        if (profileError && profileError.code !== 'PGRST116') throw profileError
        setProfile(teacherProfile)
      } else {
        const { data: studentProfile, error: profileError } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('user_id', userData.id)
          .single()
        if (profileError && profileError.code !== 'PGRST116') throw profileError
        setProfile(studentProfile)
      }

      setEditData({
        username: userData.username || '',
        specialization: userData.role === 'teacher' && profile ? (profile as TeacherProfile).specialization || '' : '',
        experience_years: userData.role === 'teacher' && profile ? (profile as TeacherProfile).experience_years || 0 : 0,
        bio: userData.role === 'teacher' && profile ? (profile as TeacherProfile).bio || '' : ''
      })

      setIsEditing(false)
      
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Przywróć oryginalne dane
    setEditData({
      username: user?.username || '',
      specialization: (profile as TeacherProfile)?.specialization || '',
      experience_years: (profile as TeacherProfile)?.experience_years || 0,
      bio: (profile as TeacherProfile)?.bio || ''
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Błąd</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Nie znaleziono użytkownika</h2>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Nagłówek */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profil użytkownika</h1>
          <p className="mt-2 text-gray-600">Zarządzaj swoimi danymi i ustawieniami</p>
        </div>

        <div className="bg-white shadow rounded-lg">
          {/* Informacje podstawowe */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Informacje podstawowe</h3>
          </div>
          
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded-md">
                  {user.email}
                </div>
              </div>

              {/* Rola */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Rola</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    user.role === 'teacher' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'teacher' ? 'Nauczyciel' : 'Kursant'}
                  </span>
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Nazwa użytkownika</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.username}
                    onChange={(e) => setEditData({...editData, username: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded-md">
                    {user.username || 'Brak'}
                  </div>
                )}
              </div>

              {/* Data utworzenia */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Data utworzenia</label>
                <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded-md">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('pl-PL') : 'Brak'}
                </div>
              </div>
            </div>
          </div>

          {/* Profil specyficzny dla roli */}
          {user.role === 'teacher' && (
            <>
              <div className="px-6 py-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Profil nauczyciela</h3>
              </div>
              
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Specjalizacja */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Specjalizacja</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.specialization}
                        onChange={(e) => setEditData({...editData, specialization: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="np. Programowanie, Matematyka"
                      />
                    ) : (
                      <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded-md">
                        {(profile as TeacherProfile)?.specialization || 'Brak'}
                      </div>
                    )}
                  </div>

                  {/* Doświadczenie */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lata doświadczenia</label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editData.experience_years}
                        onChange={(e) => setEditData({...editData, experience_years: parseInt(e.target.value) || 0})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded-md">
                        {(profile as TeacherProfile)?.experience_years || 0} lat
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">O mnie</label>
                    {isEditing ? (
                      <textarea
                        rows={4}
                        value={editData.bio}
                        onChange={(e) => setEditData({...editData, bio: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Opisz swoje doświadczenie i specjalizację..."
                      />
                    ) : (
                      <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded-md">
                        {(profile as TeacherProfile)?.bio || 'Brak opisu'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {user.role === 'student' && (
            <>
              <div className="px-6 py-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Profil kursanta</h3>
              </div>
              
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Postęp */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Postęp ogólny</label>
                    <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded-md">
                      {(profile as StudentProfile)?.progress_percentage || 0}%
                    </div>
                  </div>

                  {/* Data zapisania */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data zapisania</label>
                    <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded-md">
                      {(profile as StudentProfile)?.enrollment_date 
                        ? new Date((profile as StudentProfile).enrollment_date).toLocaleDateString('pl-PL')
                        : 'Brak'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Status synchronizacji WTL */}
          <div className="px-6 py-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Status synchronizacji WTL</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    user.wtl_sync_status === 'synced' 
                      ? 'bg-green-100 text-green-800'
                      : user.wtl_sync_status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.wtl_sync_status === 'synced' ? 'Zsynchronizowany' :
                     user.wtl_sync_status === 'failed' ? 'Błąd' : 'Oczekuje'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Ostatnia synchronizacja</label>
                <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded-md">
                  {user.wtl_last_sync 
                    ? new Date(user.wtl_last_sync).toLocaleDateString('pl-PL')
                    : 'Brak'
                  }
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">WTL User ID</label>
                <div className="mt-1 p-3 bg-gray-50 border border-gray-300 rounded-md">
                  {user.wtl_user_id || 'Brak'}
                </div>
              </div>
            </div>
          </div>

          {/* Przyciski akcji */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Zapisz zmiany
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Edytuj profil
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
