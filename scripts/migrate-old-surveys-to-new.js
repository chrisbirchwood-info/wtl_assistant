#!/usr/bin/env node

/**
 * Skrypt do migracji danych ze starego systemu ankiet do nowego
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Konfiguracja środowiska
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Brak wymaganych zmiennych środowiskowych')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function migrateOldSurveysToNew() {
  try {
    console.log('🚀 Rozpoczynam migrację ze starego systemu ankiet do nowego...\n')
    
    // 1. Pobierz wszystkie odpowiedzi ze starego systemu
    console.log('1. Pobieranie danych ze starego systemu...')
    const { data: oldResponses, error: oldError } = await supabase
      .from('survey_responses')
      .select('*')
    
    if (oldError) {
      throw new Error(`Błąd pobierania starych odpowiedzi: ${oldError.message}`)
    }
    
    console.log(`✅ Znaleziono ${oldResponses?.length || 0} odpowiedzi w starym systemie`)
    
    if (!oldResponses || oldResponses.length === 0) {
      console.log('ℹ️  Brak danych do migracji')
      return
    }
    
    // 2. Grupuj po form_id i teacher_id
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
      responsesByForm[response.form_id].push(response)
    })
    
    console.log(`✅ Znaleziono ${Object.keys(formsByTeacher).length} unikalnych formularzy`)
    
    // 3. Wstaw formularze do nowego systemu
    console.log('\n2. Migracja formularzy do survey_forms...')
    const formsToInsert = Object.values(formsByTeacher)
    
    const { error: formsError } = await supabase
      .from('survey_forms')
      .upsert(formsToInsert, { 
        onConflict: 'form_id',
        ignoreDuplicates: false 
      })
    
    if (formsError) {
      throw new Error(`Błąd wstawiania formularzy: ${formsError.message}`)
    }
    
    console.log(`✅ Zmigrowano ${formsToInsert.length} formularzy`)
    
    // 4. Migruj odpowiedzi do nowego systemu
    console.log('\n3. Migracja odpowiedzi do survey_responses...')
    const responsesToInsert = oldResponses.map(response => ({
      response_id: response.response_id,
      form_id: response.form_id,
      respondent_email: extractEmailFromPayload(response.payload),
      submitted_at: response.submitted_at,
      created_at: response.updated_at || new Date().toISOString(),
      updated_at: response.updated_at || new Date().toISOString()
    }))
    
    const { error: responsesError } = await supabase
      .from('survey_responses')
      .upsert(responsesToInsert, { 
        onConflict: 'response_id,form_id',
        ignoreDuplicates: false 
      })
    
    if (responsesError) {
      throw new Error(`Błąd wstawiania odpowiedzi: ${responsesError.message}`)
    }
    
    console.log(`✅ Zmigrowano ${responsesToInsert.length} odpowiedzi`)
    
    // 5. Migruj szczegółowe odpowiedzi (jeśli są w payload)
    console.log('\n4. Migracja szczegółowych odpowiedzi do survey_answers...')
    let totalAnswers = 0
    
    for (const response of oldResponses) {
      const answers = extractAnswersFromPayload(response.payload, response.response_id)
      if (answers.length > 0) {
        // Znajdź ID w nowym systemie
        const { data: newResponse } = await supabase
          .from('survey_responses')
          .select('id')
          .eq('response_id', response.response_id)
          .eq('form_id', response.form_id)
          .single()
        
        if (newResponse) {
          const answersToInsert = answers.map(answer => ({
            ...answer,
            response_id: newResponse.id
          }))
          
          const { error: answersError } = await supabase
            .from('survey_answers')
            .upsert(answersToInsert, { ignoreDuplicates: true })
          
          if (!answersError) {
            totalAnswers += answersToInsert.length
          }
        }
      }
    }
    
    console.log(`✅ Zmigrowano ${totalAnswers} szczegółowych odpowiedzi`)
    
    // 6. Sprawdź wyniki migracji
    console.log('\n5. Sprawdzanie wyników migracji...')
    
    const { data: newForms } = await supabase
      .from('survey_forms')
      .select('count')
    
    const { data: newResponses } = await supabase
      .from('survey_responses')
      .select('count')
    
    console.log(`✅ W nowym systemie:`)
    console.log(`   - Formularze: ${newForms?.length || 0}`)
    console.log(`   - Odpowiedzi: ${newResponses?.length || 0}`)
    
    console.log('\n🎉 Migracja zakończona pomyślnie!')
    console.log('\nTeraz możesz:')
    console.log('1. Przetestować nowy system ankiet')
    console.log('2. Usunąć stary system jeśli wszystko działa')
    
  } catch (error) {
    console.error('❌ Błąd podczas migracji:', error.message)
    process.exit(1)
  }
}

function extractEmailFromPayload(payload) {
  try {
    if (typeof payload === 'string') {
      payload = JSON.parse(payload)
    }
    
    // Szukaj emaila w różnych miejscach payload
    if (payload.respondentEmail) return payload.respondentEmail
    if (payload.email) return payload.email
    
    // Szukaj w answers
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

function extractAnswersFromPayload(payload, responseId) {
  try {
    if (typeof payload === 'string') {
      payload = JSON.parse(payload)
    }
    
    const answers = []
    
    if (payload.answers) {
      Object.entries(payload.answers).forEach(([questionId, answer]) => {
        let answerText = null
        let answerValue = null
        
        if (answer.textAnswers?.answers?.[0]?.value) {
          answerText = answer.textAnswers.answers[0].value
        } else if (answer.choiceAnswers?.answers) {
          answerText = answer.choiceAnswers.answers.map(a => a.value).join(', ')
        }
        
        answers.push({
          question_id: questionId,
          question_text: null, // Nie mamy tych danych w starym systemie
          question_type: answer.textAnswers ? 'SHORT_ANSWER' : 'MULTIPLE_CHOICE',
          answer_text: answerText,
          answer_value: answerValue,
          created_at: new Date().toISOString()
        })
      })
    }
    
    return answers
  } catch {
    return []
  }
}

migrateOldSurveysToNew().catch(console.error)
