'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useFeatureFlagsStore } from '@/store/feature-flags-store'

export default function AdminFeaturesPage() {
  const { flags, setFlag, resetDefaults } = useFeatureFlagsStore()

  return (
    <ProtectedRoute allowedRoles={['superadmin']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Feature toggles</h1>
            <p className="text-gray-600 mt-1">Włączaj i wyłączaj funkcje aplikacji lokalnie.</p>
          </div>

          <div className="bg-white shadow rounded-lg divide-y">
            <section className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">Nawigacja</h2>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">Okruszki (Breadcrumbs)</p>
                  <p className="text-sm text-gray-500">Pokazuj ścieżkę nawigacji pod górnym menu.</p>
                </div>
                <label className="inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={flags.breadcrumbsEnabled}
                    onChange={(e) => setFlag('breadcrumbsEnabled', e.target.checked)}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 rounded-full transition-colors peer-checked:bg-blue-600">
                    <span className="absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform transform peer-checked:translate-x-5" />
                  </div>
                  <span className="ml-3 text-sm text-gray-700">{flags.breadcrumbsEnabled ? 'Włączone' : 'Wyłączone'}</span>
                </label>
              </div>
            </section>

            <div className="p-6">
              <button
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md"
                onClick={resetDefaults}
              >
                Przywróć domyślne
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Uwaga: ustawienia są zapisywane lokalnie w przeglądarce (localStorage).
          </p>
        </div>
      </div>
    </ProtectedRoute>
  )
}
