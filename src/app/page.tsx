import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-20">
      {/* Hero Section */}
      <section className="text-center py-20">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Witaj w WTL Assistant
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Skalowalna aplikacja webowa zbudowana z Next.js, Supabase i integracją WTL
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/wtl"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            🚀 Przejdź do WTL Dashboard
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            📚 Dokumentacja
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-8 mt-20">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">⚡</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Next.js 15</h3>
          <p className="text-gray-600">
            Najnowsza wersja Next.js z App Router i Server Components
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">🗄️</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Supabase</h3>
          <p className="text-gray-600">
            Potężna baza danych PostgreSQL z real-time subscriptions
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">🔗</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">WTL Integration</h3>
          <p className="text-gray-600">
            Pełna integracja z serwisem WTL przez API Routes
          </p>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="text-center mt-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Technologie</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {[
            'Next.js 15',
            'TypeScript',
            'Supabase',
            'Tailwind CSS',
            'Vercel',
            'WTL API',
          ].map((tech) => (
            <span
              key={tech}
              className="px-4 py-2 bg-white border rounded-lg text-sm font-medium text-gray-700 shadow-sm"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}