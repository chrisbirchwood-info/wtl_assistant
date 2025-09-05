#!/usr/bin/env node

/**
 * Debug co zwraca Google Forms API
 */

const { createClient } = require('@supabase/supabase-js')
const { getGoogleConfigFromEnv, listFormResponses, refreshAccessToken } = require('../src/lib/google-forms.ts')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function debugGoogleFormsResponse() {
  try {
    console.log('🔍 Debug Google Forms API response...\n')
    
    const teacherId = '7f22b763-65c5-4921-a2a0-cc9469638fab'
    const formId = '1VPUjsaLD4jmEpP3XZSr4FolHd1d1uXAQCHv3qx6atgU'
    
    // Pobierz token
    const { data: tokenRow } = await supabase
      .from('google_oauth_tokens')
      .select('refresh_token')
      .eq('user_id', teacherId)
      .eq('provider', 'google')
      .single()
    
    if (!tokenRow?.refresh_token) {
      console.log('❌ Brak tokenu')
      return
    }
    
    // Odśwież token
    const { clientId, clientSecret } = getGoogleConfigFromEnv()
    const refreshed = await refreshAccessToken({
      refresh_token: tokenRow.refresh_token,
      clientId,
      clientSecret,
    })
    
    console.log('✅ Token odświeżony')
    
    // Pobierz odpowiedzi z Google
    const responses = []
    let pageToken = undefined
    do {
      const page = await listFormResponses({ 
        formId, 
        accessToken: refreshed.access_token, 
        pageToken 
      })
      if (page.responses?.length) responses.push(...page.responses)
      pageToken = page.nextPageToken
    } while (pageToken)
    
    console.log(`✅ Pobrano ${responses.length} odpowiedzi z Google Forms`)
    
    // Sprawdź strukturę pierwszej odpowiedzi
    if (responses.length > 0) {
      console.log('\n📋 Struktura pierwszej odpowiedzi:')
      console.log('Response ID:', responses[0].responseId)
      console.log('Respondent Email:', responses[0].respondentEmail)
      console.log('Has answers?', !!responses[0].answers)
      
      if (responses[0].answers) {
        console.log('Answers structure:')
        console.log(JSON.stringify(responses[0].answers, null, 2))
      } else {
        console.log('❌ Brak pola answers w odpowiedzi!')
        console.log('Pełna struktura:')
        console.log(JSON.stringify(responses[0], null, 2))
      }
    }
    
  } catch (error) {
    console.error('❌ Błąd:', error.message)
  }
}

debugGoogleFormsResponse()
