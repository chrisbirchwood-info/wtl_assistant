'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth-store'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const emailSchema = z.object({
  email: z.string().email('Nieprawidłowy format email')
})

const otpSchema = z.object({
  otp: z.string().min(6, 'OTP musi mieć 6 cyfr').max(6, 'OTP musi mieć 6 cyfr')
})

type EmailFormData = z.infer<typeof emailSchema>
type OTPFormData = z.infer<typeof otpSchema>

export default function LoginPage() {
  const { error, clearError, setLoading, login } = useAuthStore()
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema)
  })
  
  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema)
  })
  
  const onEmailSubmit = async (data: EmailFormData) => {
    try {
      setIsLoading(true)
      clearError()
      
      // Symulacja wysłania OTP (na razie nie wysyłamy)
      setSubmittedEmail(data.email)
      setStep('otp')
      toast.success('Kod OTP został wysłany na email!')
      
    } catch (error) {
      console.error('Email submit error:', error)
      toast.error('Wystąpił błąd podczas wysyłania OTP')
    } finally {
      setIsLoading(false)
    }
  }
  
  const onOTPSubmit = async (data: OTPFormData) => {
    try {
      setLoading(true)
      clearError()
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: submittedEmail,
          otp: data.otp
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        // Debug: sprawdź odpowiedź z API
        console.log('🔍 API response:', result)
        console.log('🔍 User data from API:', result.user)
        
        // Zaloguj użytkownika z pełnymi danymi
        const userData = {
          ...result.user,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 dni
        }
        
        // Debug: sprawdź dane użytkownika przed przekazaniem do store'a
        console.log('🔍 User data for store:', userData)
        
        login(userData)
        toast.success('Logowanie udane!')
        router.push('/wtl')
      } else {
        toast.error(result.error || 'Wystąpił błąd podczas logowania')
      }
      
    } catch (error) {
      console.error('OTP submit error:', error)
      toast.error('Wystąpił błąd podczas logowania')
    } finally {
      setLoading(false)
    }
  }
  
  const goBackToEmail = () => {
    setStep('email')
    setSubmittedEmail('')
    otpForm.reset()
  }
  
  // Czyść pole OTP przy każdym renderowaniu kroku OTP
  useEffect(() => {
    if (step === 'otp') {
      otpForm.reset()
      // Dodatkowo wyczyść pole ręcznie
      const otpInput = document.getElementById('otp') as HTMLInputElement
      if (otpInput) {
        otpInput.value = ''
      }
    }
  }, [step, otpForm])
  
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
          
          <form 
            key={`otp-form-${submittedEmail}`}
            className="mt-8 space-y-6" 
            onSubmit={otpForm.handleSubmit(onOTPSubmit)}
          >
            <div>
              <label htmlFor="otp" className="sr-only">
                Kod OTP
              </label>
              <input
                {...otpForm.register('otp')}
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
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
              />
              {otpForm.formState.errors.otp && (
                <p className="mt-1 text-sm text-red-600">{otpForm.formState.errors.otp.message}</p>
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
                    Logowanie...
                  </>
                ) : (
                  'Zaloguj się'
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
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Zaloguj się do WTL Assistant
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Użyj tego samego emaila co w WebToLearn
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={emailForm.handleSubmit(onEmailSubmit)}>
          <div>
            <label htmlFor="email" className="sr-only">
              Adres email
            </label>
            <input
              {...emailForm.register('email')}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Adres email"
            />
            {emailForm.formState.errors.email && (
              <p className="mt-1 text-sm text-red-600">{emailForm.formState.errors.email.message}</p>
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
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Wysyłanie...
                </>
              ) : (
                'Wyślij hasło jednorazowe (OTP)'
              )}
            </button>
          </div>
        </form>
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Kod OTP zostanie wysłany na podany adres email.
          </p>
          <div className="pt-4 space-y-2">
            <p className="text-xs text-gray-400">
              Jesteś nauczycielem w systemie WTL?
            </p>
            <Link 
              href="/auth/register-teacher" 
              className="text-sm text-green-600 hover:text-green-500 font-medium"
            >
              Zarejestruj się jako nauczyciel →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

