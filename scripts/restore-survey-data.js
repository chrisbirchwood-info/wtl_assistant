#!/usr/bin/env node

/**
 * Przywracanie danych z backup do nowego systemu
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function restoreSurveyData() {
  try {
    console.log('🔄 Przywracanie danych z backup...\n')
    
    // Wczytaj backup
    const backupPath = path.join(__dirname, 'survey-backup.json')
    if (!fs.existsSync(backupPath)) {
      console.error('❌ Plik backup nie istnieje:', backupPath)
      process.exit(1)
    }
    
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
    console.log(`📦 Wczytano backup:`)
    console.log(`   - Formularze: ${Object.keys(backup.forms).length}`)
    console.log(`   - Odpowiedzi: ${Object.keys(backup.responses).length}`)
    
    // 1. Przywróć formularze
    console.log('\n1. Przywracanie formularzy...')
    const formsToInsert = Object.values(backup.forms)
    
    const { error: formsError } = await supabase
      .from('survey_forms')
      .upsert(formsToInsert, { onConflict: 'form_id' })
    
    if (formsError) {
      throw new Error(`Błąd przywracania formularzy: ${formsError.message}`)
    }
    
    console.log(`✅ Przywrócono ${formsToInsert.length} formularzy`)
    
    // 2. Przywróć odpowiedzi
    console.log('\n2. Przywracanie odpowiedzi...')
    let totalResponses = 0
    
    for (const [formId, responses] of Object.entries(backup.responses)) {
      const responsesToInsert = responses.map(r => ({
        response_id: r.response_id,
        form_id: r.form_id,
        respondent_email: r.respondent_email,
        submitted_at: r.submitted_at,
        created_at: r.created_at,
        updated_at: r.updated_at
      }))
      
      const { error: responsesError } = await supabase
        .from('survey_responses')
        .upsert(responsesToInsert, { onConflict: 'response_id,form_id' })
      
      if (responsesError) {
        console.warn(`⚠️  Błąd przywracania odpowiedzi dla ${formId}:`, responsesError.message)
      } else {
        totalResponses += responsesToInsert.length
        console.log(`✅ Form ${formId}: ${responsesToInsert.length} odpowiedzi`)
      }
    }
    
    console.log(`✅ Łącznie przywrócono ${totalResponses} odpowiedzi`)
    
    // 3. Sprawdź wyniki
    console.log('\n3. Sprawdzanie wyników...')
    
    const { data: finalForms } = await supabase
      .from('survey_forms')
      .select('form_id, title, total_responses')
    
    const { data: finalResponses } = await supabase
      .from('survey_responses')
      .select('count')
    
    console.log(`✅ Stan po przywróceniu:`)
    console.log(`   - Formularze: ${finalForms?.length || 0}`)
    finalForms?.forEach(form => {
      console.log(`     • ${form.form_id}: "${form.title}" (${form.total_responses} odpowiedzi)`)
    })
    console.log(`   - Odpowiedzi: ${finalResponses?.length || 0}`)
    
    console.log('\n🎉 Dane zostały przywrócone!')
    console.log('\nTeraz możesz:')
    console.log('1. Przetestować dropdown ankiet w wątkach')
    console.log('2. Linkować ankiety z wątkami')
    
  } catch (error) {
    console.error('❌ Błąd podczas przywracania:', error.message)
    process.exit(1)
  }
}

restoreSurveyData()
