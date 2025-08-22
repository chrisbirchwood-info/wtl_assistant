import { NextResponse } from 'next/server'
import axios from 'axios'

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
