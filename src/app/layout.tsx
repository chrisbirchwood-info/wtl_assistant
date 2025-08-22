import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WTL Assistant",
  description: "Skalowalna aplikacja do zarządzania projektami WTL",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <nav className="max-w-7xl mx-auto px-4">
              <div className="flex justify-between items-center h-16">
                <Link href="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">W</span>
                  </div>
                  <span className="text-xl font-semibold text-gray-900">WTL Assistant</span>
                </Link>
                
                <div className="flex items-center space-x-4">
                  <Link
                    href="/wtl"
                    className="text-gray-600 hover:text-blue-600 font-medium"
                  >
                    WTL Dashboard
                  </Link>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-gray-600 hover:text-blue-600 font-medium"
                  >
                    Zaloguj się
                  </Link>
                </div>
              </div>
            </nav>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-gray-50 border-t">
            <div className="max-w-7xl mx-auto px-4 py-8">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">W</span>
                  </div>
                  <span className="text-xl font-semibold text-gray-900">WTL Assistant</span>
                </div>
                <p className="text-sm text-gray-600">
                  © 2025 WTL Assistant. Wszystkie prawa zastrzeżone.
                </p>
              </div>
            </div>
          </footer>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
