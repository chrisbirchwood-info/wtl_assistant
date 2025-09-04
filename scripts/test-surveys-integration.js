import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Załaduj zmienne środowiskowe
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🧪 Test integracji systemu surveys...')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Brak zmiennych środowiskowych Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testSurveysIntegration() {
  try {
    console.log('\n📋 Sprawdzanie tabel surveys...')
    
    // Sprawdź czy tabele istnieją
    const tables = ['google_oauth_tokens', 'survey_responses']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`❌ Tabela ${table}: ${error.message}`)
          return false
        } else {
          console.log(`✅ Tabela ${table}: dostępna`)
          if (data && data.length > 0) {
            console.log(`   - Kolumny: ${Object.keys(data[0]).join(', ')}`)
          }
        }
      } catch (error) {
        console.log(`❌ Tabela ${table}: błąd - ${error.message}`)
        return false
      }
    }
    
    console.log('\n🔍 Sprawdzanie polityk RLS...')
    
    // Sprawdź czy RLS jest włączony
    const { data: rlsData, error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT schemaname, tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('google_oauth_tokens', 'survey_responses')
      `
    })
    
    if (rlsError) {
      console.log('⚠️  Nie można sprawdzić polityk RLS')
    } else if (rlsData) {
      console.log('📊 Status RLS:', rlsData)
    }
    
    console.log('\n🔑 Sprawdzanie konfiguracji Google OAuth...')
    
    const googleConfig = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    }
    
    Object.entries(googleConfig).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value ? '✅ ustawiona' : '❌ brak'}`)
    })
    
    const allConfigured = Object.values(googleConfig).every(v => v)
    
    console.log('\n📊 Podsumowanie testów:')
    console.log(`   - Tabele bazy danych: ✅`)
    console.log(`   - Konfiguracja Google: ${allConfigured ? '✅' : '❌'}`)
    
    if (!allConfigured) {
      console.log('\n💡 Aby dokończyć konfigurację:')
      console.log('   1. Ustaw zmienne środowiskowe Google OAuth w .env.local')
      console.log('   2. GOOGLE_CLIENT_ID=your_client_id')
      console.log('   3. GOOGLE_CLIENT_SECRET=your_client_secret')
      console.log('   4. GOOGLE_REDIRECT_URI=http://localhost:3000/api/surveys/google/callback')
      return false
    }
    
    console.log('\n✅ System surveys jest gotowy do użycia!')
    return true
    
  } catch (error) {
    console.error('❌ Błąd podczas testowania:', error.message)
    return false
  }
}

// Uruchom testy
const success = await testSurveysIntegration()

if (!success) {
  console.log('\n🔴 Testy nie przeszły!')
  console.log('📋 Sprawdź logi powyżej i rozwiąż problemy.')
  process.exit(1)
} else {
  console.log('\n🟢 Wszystkie testy przeszły pomyślnie!')
}
