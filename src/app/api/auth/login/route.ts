import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP, generateUserSession } from '@/lib/auth'
import { wtlClient } from '@/lib/wtl-client'

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json()
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email jest wymagany' },
        { status: 400 }
      )
    }
    
    if (!otp || typeof otp !== 'string') {
      return NextResponse.json(
        { error: 'OTP jest wymagany' },
        { status: 400 }
      )
    }
    
    // Sprawdź czy email jest poprawny
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Nieprawidłowy format email' },
        { status: 400 }
      )
    }
    
    // Weryfikuj OTP
    if (!verifyOTP(otp)) {
      return NextResponse.json(
        { error: 'Nieprawidłowy kod OTP' },
        { status: 400 }
      )
    }
    
    // Weryfikuj użytkownika w systemie WebToLearn
    const userVerification = await wtlClient.verifyUserByEmail(email)
    
    if (!userVerification.success) {
      return NextResponse.json(
        { error: 'Użytkownik nie istnieje w systemie WebToLearn' },
        { status: 404 }
      )
    }
    
    // Generuj sesję użytkownika
    const userData = userVerification.data
    const userSession = generateUserSession({
      id: userData.id,
      email: userData.email,
      username: userData.username
    })
    
    return NextResponse.json({
      success: true,
      message: 'Logowanie udane',
      user: {
        id: userData.id,
        email: userData.email,
        username: userData.username
      },
      session: userSession
    })
    
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas przetwarzania żądania' },
      { status: 500 }
    )
  }
}

