#!/usr/bin/env node

/**
 * Test linkowania z prawdziwymi danymi
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function testRealThreadLinking() {
  try {
    console.log('🔍 Test linkowania z prawdziwymi danymi...\n')
    
    // 1. Znajdź prawdziwy thread dla ucznia brzakalikoskar@gmail.com
    console.log('1. Szukam wątków ucznia brzakalikoskar@gmail.com...')
    
    // Najpierw znajdź user_id
    const { data: student } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'brzakalikoskar@gmail.com')
      .single()
    
    if (!student) {
      console.log('❌ Nie znaleziono ucznia')
      return
    }
    
    console.log(`✅ Znaleziono ucznia: ${student.id}`)
    
    // Znajdź wątki tego ucznia
    const { data: threads } = await supabase
      .from('threads')
      .select('id, title, user_id')
      .eq('user_id', student.id)
      .limit(5)
    
    console.log(`✅ Znaleziono ${threads?.length || 0} wątków:`)
    threads?.forEach(thread => {
      console.log(`   - ${thread.id}: "${thread.title}"`)
    })
    
    if (!threads || threads.length === 0) {
      console.log('❌ Brak wątków do testowania')
      return
    }
    
    // 2. Znajdź dostępne formularze
    console.log('\n2. Sprawdzam dostępne formularze...')
    const { data: forms } = await supabase
      .from('survey_forms')
      .select('form_id, title, teacher_id')
    
    console.log(`✅ Znaleziono ${forms?.length || 0} formularzy:`)
    forms?.forEach(form => {
      console.log(`   - ${form.form_id}: "${form.title}"`)
    })
    
    if (!forms || forms.length === 0) {
      console.log('❌ Brak formularzy do testowania')
      return
    }
    
    // 3. Test linkowania
    console.log('\n3. Test linkowania...')
    const testThreadId = threads[0].id
    const testFormId = forms[0].form_id
    const teacherId = forms[0].teacher_id
    
    console.log(`Thread: ${testThreadId}`)
    console.log(`Form: ${testFormId}`)
    console.log(`Teacher: ${teacherId}`)
    
    // Test przez API
    const response = await fetch('http://localhost:3001/api/threads/survey-connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thread_id: testThreadId,
        form_id: testFormId,
        teacher_id: teacherId
      })
    })
    
    console.log(`\n📊 Wynik linkowania:`)
    console.log(`Status: ${response.status}`)
    
    const result = await response.text()
    console.log(`Response: ${result}`)
    
    if (response.ok) {
      console.log('\n🎉 Linkowanie działa!')
    } else {
      console.log('\n❌ Błąd linkowania')
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas testu:', error.message)
  }
}

testRealThreadLinking()
