#!/usr/bin/env node

/**
 * Migracja danych ze starego systemu do nowego z czystymi nazwami
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function migrateToCleanSystem() {
  try {
    console.log('🚀 Migracja do czystego systemu ankiet...\n')
    
    // 1. Pobierz dane ze starego systemu (backup przed usunięciem)
    console.log('1. Backup danych ze starego systemu...')
    const { data: oldResponses, error: oldError } = await supabase
      .from('survey_responses')
      .select('*')
    
    if (oldError && oldError.code !== '42P01') {
      throw new Error(`Błąd pobierania starych danych: ${oldError.message}`)
    }
    
    console.log(`📦 Backup: ${oldResponses?.length || 0} odpowiedzi`)
    
    // 2. Grupuj dane dla nowego systemu
    if (oldResponses && oldResponses.length > 0) {
      const formsByTeacher = {}
      const responsesByForm = {}
      
      oldResponses.forEach(response => {
        const key = `${response.teacher_id}-${response.form_id}`
        
        if (!formsByTeacher[key]) {
          formsByTeacher[key] = {
            form_id: response.form_id,
            teacher_id: response.teacher_id,
            title: `Ankieta ${response.form_id.substring(0, 8)}...`,
            description: null,
            questions: null,
            created_at: response.updated_at || new Date().toISOString(),
            updated_at: response.updated_at || new Date().toISOString(),
            total_responses: 0
          }
          responsesByForm[response.form_id] = []
        }
        
        formsByTeacher[key].total_responses++
        responsesByForm[response.form_id].push({
          response_id: response.response_id,
          form_id: response.form_id,
          respondent_email: extractEmailFromPayload(response.payload),
          submitted_at: response.submitted_at,
          created_at: response.updated_at || new Date().toISOString(),
          updated_at: response.updated_at || new Date().toISOString(),
          original_payload: response.payload
        })
      })
      
      console.log(`📊 Przygotowano ${Object.keys(formsByTeacher).length} formularzy do migracji`)
      
      // Zapisz do pliku jako backup
      require('fs').writeFileSync(
        path.join(__dirname, 'survey-backup.json'), 
        JSON.stringify({ forms: formsByTeacher, responses: responsesByForm }, null, 2)
      )
      console.log('💾 Backup zapisany w survey-backup.json')
    }
    
    console.log('\n2. Czyste tabele zostały utworzone przez migrację SQL')
    console.log('3. Dane są zabezpieczone w backup')
    console.log('\n🎉 System jest gotowy!')
    console.log('\nAby przywrócić dane:')
    console.log('1. Sprawdź survey-backup.json')
    console.log('2. Ręcznie dodaj formularze przez panel ankiet')
    console.log('3. Zsynchronizuj odpowiedzi')
    
  } catch (error) {
    console.error('❌ Błąd podczas migracji:', error.message)
  }
}

function extractEmailFromPayload(payload) {
  try {
    if (typeof payload === 'string') {
      payload = JSON.parse(payload)
    }
    
    if (payload.respondentEmail) return payload.respondentEmail
    if (payload.email) return payload.email
    
    if (payload.answers) {
      for (const answer of Object.values(payload.answers)) {
        if (answer.textAnswers?.answers?.[0]?.value?.includes('@')) {
          return answer.textAnswers.answers[0].value
        }
      }
    }
    
    return null
  } catch {
    return null
  }
}

migrateToCleanSystem()
