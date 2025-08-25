import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import axios from 'axios'
import { wtlClient } from '@/lib/wtl-client'

export async function GET() {
  try {
    console.log('Testing WTL API public endpoints...')
    
    const baseURL = 'https://teachm3.elms.pl/api/v1'
    const testEndpoints = [
      '/projects',
      '/courses',
      '/users',
      '/health',
      '/status',
      '/info',
      '/public',
      '/'
    ]

    const results = []

    for (const endpoint of testEndpoints) {
      try {
        console.log(`Testing: ${baseURL}${endpoint}`)
        
        // Test bez autoryzacji
        const response = await axios.get(`${baseURL}${endpoint}`, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'WTL-Assistant-Test/1.0.0'
          }
        })
        
        results.push({
          endpoint,
          status: 'success',
          statusCode: response.status,
          dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
          dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
          sample: JSON.stringify(response.data).substring(0, 100)
        })
        
        console.log(`✓ ${endpoint}: ${response.status}`)
        
      } catch (error: any) {
        results.push({
          endpoint,
          status: 'error',
          statusCode: error.response?.status,
          error: error.response?.data || error.message
        })
        
        console.log(`✗ ${endpoint}: ${error.response?.status || error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      baseURL,
      message: 'Public endpoint test completed',
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length
      }
    })

  } catch (error) {
    console.error('Public test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, action } = await request.json()
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email jest wymagany' },
        { status: 400 }
      )
    }
    
    if (action === 'verify_teacher') {
      console.log(`🔍 Verifying teacher in WTL: ${email}`)
      
      try {
        // Sprawdź czy użytkownik ma uprawnienia nauczyciela w WTL
        const wtlUser = await wtlClient.verifyUserWithRole(email)
        
        if (!wtlUser.success || !wtlUser.data) {
          return NextResponse.json(
            { error: 'Użytkownik nie został znaleziony w systemie WTL' },
            { status: 404 }
          )
        }
        
        // Sprawdź czy użytkownik ma rolę nauczyciela w WTL
        if (wtlUser.data.role !== 'teacher') {
          return NextResponse.json(
            { error: 'Użytkownik nie ma uprawnień nauczyciela w systemie WTL' },
            { status: 403 }
          )
        }
        
        console.log(`✅ Teacher verified in WTL: ${email}, role: ${wtlUser.data.role}`)
        
        return NextResponse.json({
          success: true,
          message: 'Weryfikacja nauczyciela udana',
          user: {
            email: wtlUser.data.email,
            role: wtlUser.data.role,
            name: wtlUser.data.name
          }
        })
        
      } catch (error) {
        console.error(`❌ WTL API verification failed for ${email}:`, error)
        return NextResponse.json(
          { error: 'Błąd podczas weryfikacji w systemie WTL' },
          { status: 500 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Nieznana akcja' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('POST test-public error:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas przetwarzania żądania' },
      { status: 500 }
    )
  }
}
