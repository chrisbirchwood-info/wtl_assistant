import { NextResponse } from 'next/server'
import wtlClient from '@/lib/wtl-client'

export async function GET() {
  try {
    console.log('Testing WTL API connection...')
    console.log('WTL_API_URL:', process.env.WTL_API_URL)
    console.log('WTL_API_KEY:', process.env.WTL_API_KEY ? 'SET' : 'NOT SET')
    
    // Test różnych endpointów
    const testEndpoints = [
      '/projects',
      '/api/projects', 
      '/v1/projects',
      '/courses',
      '/api/courses',
      '/health',
      '/',
      '/status'
    ]

    const results = []

    for (const endpoint of testEndpoints) {
      try {
        const response = await wtlClient['client'].get(endpoint)
        results.push({
          endpoint,
          status: 'success',
          statusCode: response.status,
          data: response.data ? 'Data received' : 'No data'
        })
        console.log(`✓ ${endpoint}: ${response.status}`)
      } catch (error: any) {
        results.push({
          endpoint,
          status: 'error',
          error: error.response?.status || error.code || error.message
        })
        console.log(`✗ ${endpoint}: ${error.response?.status || error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      baseURL: process.env.WTL_API_URL || 'https://api.webtolearn.com',
      hasApiKey: !!process.env.WTL_API_KEY,
      results,
      message: 'WTL API connection test completed'
    })

  } catch (error) {
    console.error('WTL test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      baseURL: process.env.WTL_API_URL || 'https://api.webtolearn.com',
      hasApiKey: !!process.env.WTL_API_KEY
    })
  }
}
