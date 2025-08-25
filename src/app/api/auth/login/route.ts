import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP, generateUserSession } from '@/lib/auth'
import { wtlClient } from '@/lib/wtl-client'
import { createUser, getUserByEmail } from '@/lib/supabase'
import { UserSyncService } from '@/lib/user-sync-service'

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
    
    console.log(`🔐 Login attempt for: ${email}`)
    
    // 1. Sprawdź czy użytkownik istnieje w Supabase
    let supabaseUser = await getUserByEmail(email)
    
    if (!supabaseUser) {
      console.log(`👤 User not found in Supabase, creating new user: ${email}`)
      
      // 2. Utwórz użytkownika w Supabase z domyślną rolą 'student'
      try {
        supabaseUser = await createUser({
          email: email,
          username: email.split('@')[0], // Użyj części przed @ jako username
          role: 'student' // ZAWSZE ustaw jako kursanta dla nowych użytkowników
        })
        
        console.log(`✅ User created in Supabase: ${supabaseUser.id}`)
        console.log(`🔍 Created user role: ${supabaseUser.role}`)
        
        // 3. Uruchom weryfikację WTL w tle (nie blokuj logowania)
        const syncService = new UserSyncService()
        syncService.syncUser(email).catch(error => {
          console.error(`⚠️ Background WTL sync failed for ${email}:`, error)
        })
        
      } catch (error) {
        console.error(`❌ Failed to create user in Supabase: ${email}`, error)
        return NextResponse.json(
          { error: 'Błąd podczas tworzenia użytkownika' },
          { status: 500 }
        )
      }
    } else {
      console.log(`👤 User found in Supabase: ${supabaseUser.id}`)
      console.log(`🔍 Existing user role: ${supabaseUser.role}`)
      
      // 5. Uruchom synchronizację z WTL w tle dla istniejącego użytkownika
      const syncService = new UserSyncService()
      syncService.syncUser(email).catch(error => {
        console.error(`⚠️ Background sync failed for ${email}:`, error)
      })
    }
    
    // Upewnij się, że użytkownik ma ustawioną rolę
    // Dla nowych użytkowników ZAWSZE 'student', dla istniejących zachowaj obecną
    if (!supabaseUser.role) {
      console.log(`⚠️ User has no role, setting default role 'student'`)
      supabaseUser.role = 'student'
    }
    
    // Dodatkowe zabezpieczenie: jeśli użytkownik nie ma roli 'teacher' w bazie,
    // to nie może być nauczycielem (nawet jeśli WTL mówi inaczej)
    if (supabaseUser.role !== 'teacher') {
      console.log(`🔒 User role is not 'teacher', ensuring role is 'student'`)
      supabaseUser.role = 'student'
    }
    
    // 6. Generuj sesję użytkownika
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
    
    // Debug: sprawdź rolę użytkownika
    console.log(`🔍 User role in API response: ${supabaseUser.role}`)
    console.log(`🔍 Full user data:`, supabaseUser)
    
    // Sesja jest zarządzana przez JWT + Zustand (nie zapisujemy do bazy)
    
    console.log(`✅ Login successful for: ${email}`)
    
    return NextResponse.json({
      success: true,
      message: 'Logowanie udane',
      user: {
        id: supabaseUser.id,
        email: supabaseUser.email,
        username: supabaseUser.username,
        role: supabaseUser.role || 'student'
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

