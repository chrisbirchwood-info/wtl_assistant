#!/usr/bin/env node

/**
 * Debug Google Forms API access
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function debugGoogleForms() {
  try {
    console.log('🔍 Debug Google Forms access...\n')
    
    // Sprawdź OAuth tokens
    console.log('1. Sprawdzam OAuth tokens...')
    const { data: tokens, error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .select('*')
    
    if (tokenError) {
      console.log('❌ Błąd OAuth tokens:', tokenError.message)
      return
    }
    
    console.log(`✅ Znaleziono ${tokens?.length || 0} tokenów OAuth`)
    tokens?.forEach(token => {
      console.log(`   - User: ${token.user_id}`)
      console.log(`   - Provider: ${token.provider}`)
      console.log(`   - Scope: ${token.scope}`)
      console.log(`   - Created: ${token.created_at}`)
    })
    
    if (!tokens || tokens.length === 0) {
      console.log('\n❌ Brak tokenów OAuth!')
      console.log('Przejdź do /teacher/[teacherId]/surveys i połącz z Google')
      return
    }
    
    // Sprawdź czy masz ankiety w localStorage
    console.log('\n2. Sprawdź swoje ankiety w panelu:')
    console.log('   - Przejdź do /teacher/[teacherId]/surveys')
    console.log('   - Sprawdź czy masz dodane linki do ankiet')
    console.log('   - Sprawdź czy ID formularza jest poprawne')
    
    console.log('\n3. Typowe przyczyny błędu 404:')
    console.log('   ❌ Nieprawidłowy link do formularza')
    console.log('   ❌ Formularz został usunięty z Google Drive')
    console.log('   ❌ Brak uprawnień do formularza')
    console.log('   ❌ Formularz nie jest publiczny/udostępniony')
    
    console.log('\n4. Jak naprawić:')
    console.log('   ✅ Sprawdź link do formularza w przeglądarce')
    console.log('   ✅ Upewnij się, że jesteś właścicielem formularza')
    console.log('   ✅ Sprawdź ustawienia udostępniania w Google Forms')
    console.log('   ✅ Spróbuj usunąć i dodać ponownie ankietę')
    
  } catch (error) {
    console.error('❌ Błąd podczas debug:', error.message)
  }
}

debugGoogleForms()
