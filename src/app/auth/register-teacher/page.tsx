'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth-store'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const teacherRegistrationSchema = z.object({
  email: z.string().email('Nieprawidłowy format email'),
  otp: z.string().min(6, 'OTP musi mieć 6 cyfr').max(6, 'OTP musi mieć 6 cyfr'),
  teacherCode: z.string().min(1, 'Kod nauczyciela jest wymagany')
})

type TeacherRegistrationData = z.infer<typeof teacherRegistrationSchema>

export default function TeacherRegistrationPage() {
  const { error, clearError, setLoading, login } = useAuthStore()
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'otp' | 'teacherCode'>('email')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const form = useForm<TeacherRegistrationData>({
    resolver: zodResolver(teacherRegistrationSchema)
  })
  
  const onEmailSubmit = async (data: { email: string }) => {
    try {
      setIsLoading(true)
      clearError()
      
      // Symulacja wysłania OTP (na razie nie wysyłamy)
      setSubmittedEmail(data.email)
      setStep('otp')
      toast.success('Kod OTP został wysłany na email!')
      
    } catch (error) {
      console.error('Email submit error:', error)
      toast.error('Wystąpił błąd podczas wysłania OTP')
    } finally {
      setIsLoading(false)
    }
  }
  
  const onOTPSubmit = async (data: { otp: string }) => {
    try {
      setLoading(true)
      clearError()
      
      // Sprawdź czy użytkownik ma uprawnienia nauczyciela w WTL
      const response = await fetch('/api/wtl/test-public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: submittedEmail,
          action: 'verify_teacher'
        })
      })
      
      if (response.ok) {
        setStep('teacherCode')
        toast.success('Weryfikacja WTL udana! Wprowadź kod nauczyciela.')
      } else {
        toast.error('Ten email nie ma uprawnień nauczyciela w systemie WTL')
      }
      
    } catch (error) {
      console.error('OTP submit error:', error)
      toast.error('Wystąpił błąd podczas weryfikacji')
    } finally {
      setLoading(false)
    }
  }
  
  const onTeacherCodeSubmit = async (data: TeacherRegistrationData) => {
    try {
      setLoading(true)
      clearError()
      
      const response = await fetch('/api/auth/register-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: submittedEmail,
          otp: data.otp,
          teacherCode: data.teacherCode
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        // Zaloguj użytkownika z pełnymi danymi
        const userData = {
          ...result.user,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 dni
        }
        login(userData)
        toast.success('Rejestracja nauczyciela udana!')
        router.push('/wtl')
      } else {
        toast.error(result.error || 'Wystąpił błąd podczas rejestracji')
      }
      
    } catch (error) {
      console.error('Teacher code submit error:', error)
      toast.error('Wystąpił błąd podczas rejestracji')
    } finally {
      setLoading(false)
    }
  }
  
  const goBackToEmail = () => {
    setStep('email')
    setSubmittedEmail('')
    form.reset()
  }
  
  const goBackToOTP = () => {
    setStep('otp')
    form.setValue('teacherCode', '')
  }
  
  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Wprowadź kod OTP
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Kod został wysłany na adres:
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {submittedEmail}
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={form.handleSubmit(onOTPSubmit)}>
            <div>
              <label htmlFor="otp" className="sr-only">
                Kod OTP
              </label>
              <input
                {...form.register('otp')}
                id="otp"
                name="otp"
                type="text"
                maxLength={6}
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center text-lg font-mono"
                placeholder="000000"
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              {form.formState.errors.otp && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.otp.message}</p>
              )}
            </div>
            
            {error && (
              <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-3">
              <button
                type="submit"
                disabled={useAuthStore.getState().isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {useAuthStore.getState().isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Weryfikacja...
                  </>
                ) : (
                  'Weryfikuj w WTL'
                )}
              </button>
              
              <button
                type="button"
                onClick={goBackToEmail}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Wróć do email
              </button>
            </div>
          </form>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Kod OTP jest ważny przez 10 minut.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              💡 Podpowiedź: kod to 555555
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  if (step === 'teacherCode') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Wprowadź kod nauczyciela
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Weryfikacja WTL udana! Teraz wprowadź kod nauczyciela.
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={form.handleSubmit(onTeacherCodeSubmit)}>
            <div>
              <label htmlFor="teacherCode" className="sr-only">
                Kod nauczyciela
              </label>
              <input
                {...form.register('teacherCode')}
                id="teacherCode"
                name="teacherCode"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center"
                placeholder="Kod nauczyciela"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              {form.formState.errors.teacherCode && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.teacherCode.message}</p>
              )}
            </div>
            
            {error && (
              <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-3">
              <button
                type="submit"
                disabled={useAuthStore.getState().isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {useAuthStore.getState().isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Rejestracja...
                  </>
                ) : (
                  'Zarejestruj jako nauczyciel'
                )}
              </button>
              
              <button
                type="button"
                onClick={goBackToOTP}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Wróć do OTP
              </button>
            </div>
          </form>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Kod nauczyciela jest wymagany do weryfikacji uprawnień.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              💡 Dostępne kody: TEACHER2024, WTL_TEACHER, EDU_ACCESS
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Rejestracja nauczyciela
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Zarejestruj się jako nauczyciel w systemie WTL
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={form.handleSubmit(onEmailSubmit)}>
          <div>
            <label htmlFor="email" className="sr-only">
              Adres email
            </label>
            <input
              {...form.register('email')}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Adres email z WTL"
            />
            {form.formState.errors.email && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>
          
          {error && (
            <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Wysyłanie...
                </>
              ) : (
                'Wyślij kod OTP'
              )}
            </button>
          </div>
        </form>
        
        <div className="text-center space-y-2">
          <p className="text-xs text-gray-500">
            Kod OTP zostanie wysłany na podany adres email.
          </p>
          <p className="text-xs text-gray-400">
            Musisz mieć uprawnienia nauczyciela w systemie WTL.
          </p>
          <div className="pt-4">
            <Link 
              href="/auth/login" 
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ← Wróć do logowania
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
