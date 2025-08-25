import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP, generateUserSession } from '@/lib/auth'
import { wtlClient } from '@/lib/wtl-client'
import { createUser, getUserByEmail } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, otp, teacherCode } = await request.json()
    
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
    
    if (!teacherCode || typeof teacherCode !== 'string') {
      return NextResponse.json(
        { error: 'Kod nauczyciela jest wymagany' },
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
    
    console.log(`🔐 Teacher registration attempt for: ${email}`)
    
    // 1. Sprawdź czy użytkownik istnieje w Supabase
    let supabaseUser = await getUserByEmail(email)
    
    if (supabaseUser) {
      return NextResponse.json(
        { error: 'Użytkownik już istnieje w systemie' },
        { status: 400 }
      )
    }
    
    // 2. Weryfikuj nauczyciela w WTL API
    console.log(`🔍 Verifying teacher in WTL API: ${email}`)
    
    try {
      // Sprawdź czy użytkownik ma uprawnienia nauczyciela w WTL
      const wtlUser = await wtlClient.verifyUserWithRole(email)
      
      if (!wtlUser.success || !wtlUser.data) {
        return NextResponse.json(
          { error: 'Użytkownik nie został znaleziony w systemie WTL' },
          { status: 400 }
        )
      }
      
      // Sprawdź czy użytkownik ma rolę nauczyciela w WTL
      if (wtlUser.data.role !== 'teacher') {
        return NextResponse.json(
          { error: 'Użytkownik nie ma uprawnień nauczyciela w systemie WTL' },
          { status: 403 }
        )
      }
      
      // 3. Sprawdź kod nauczyciela (można dodać dodatkową weryfikację)
      // Na razie używamy prostego sprawdzenia
      const validTeacherCodes = ['TEACHER2024', 'WTL_TEACHER', 'EDU_ACCESS']
      if (!validTeacherCodes.includes(teacherCode)) {
        return NextResponse.json(
          { error: 'Nieprawidłowy kod nauczyciela' },
          { status: 400 }
        )
      }
      
      console.log(`✅ Teacher verified in WTL: ${email}, role: ${wtlUser.data.role}`)
      
      // 4. Utwórz użytkownika w Supabase z rolą 'teacher'
      try {
        supabaseUser = await createUser({
          email: email,
          username: email.split('@')[0],
          role: 'teacher' // Ustaw jako nauczyciela
        })
        
        console.log(`✅ Teacher created in Supabase: ${supabaseUser.id}`)
        console.log(`🔍 Created teacher role: ${supabaseUser.role}`)
        
      } catch (error) {
        console.error(`❌ Failed to create teacher in Supabase: ${email}`, error)
        return NextResponse.json(
          { error: 'Błąd podczas tworzenia konta nauczyciela' },
          { status: 500 }
        )
      }
      
    } catch (error) {
      console.error(`❌ WTL API verification failed for ${email}:`, error)
      return NextResponse.json(
        { error: 'Błąd podczas weryfikacji w systemie WTL' },
        { status: 500 }
      )
    }
    
    // 5. Generuj sesję użytkownika
    const userSession = generateUserSession({
      id: supabaseUser.id,
      email: supabaseUser.email,
      username: supabaseUser.username,
      role: supabaseUser.role,
      wtl_user_id: supabaseUser.wtl_user_id,
      wtl_last_sync: supabaseUser.wtl_last_sync,
      wtl_sync_status: supabaseUser.wtl_sync_status,
      created_at: supabaseUser.created_at,
      updated_at: supabaseUser.updated_at
    })
    
    console.log(`✅ Teacher registration successful for: ${email}`)
    
    return NextResponse.json({
      success: true,
      message: 'Rejestracja nauczyciela udana',
      user: {
        id: supabaseUser.id,
        email: supabaseUser.email,
        username: supabaseUser.username,
        role: supabaseUser.role
      },
      session: userSession
    })
    
  } catch (error) {
    console.error('Teacher registration API error:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas przetwarzania żądania' },
      { status: 500 }
    )
  }
}
