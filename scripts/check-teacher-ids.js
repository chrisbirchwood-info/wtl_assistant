#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkTeacherIds() {
  try {
    console.log('🔍 Sprawdzam teacher_id w starych danych...\n')
    
    // Pobierz unikalne teacher_id ze starego systemu
    const { data: oldResponses } = await supabase
      .from('survey_responses')
      .select('teacher_id')
    
    const uniqueTeacherIds = [...new Set(oldResponses?.map(r => r.teacher_id) || [])]
    console.log('Teacher IDs w starym systemie:')
    uniqueTeacherIds.forEach(id => console.log(`  - ${id}`))
    
    console.log('\n🔍 Sprawdzam czy te teacher_id istnieją w auth.users...')
    
    for (const teacherId of uniqueTeacherIds) {
      const { data: user } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', teacherId)
        .single()
      
      if (user) {
        console.log(`✅ ${teacherId} - ${user.email}`)
      } else {
        console.log(`❌ ${teacherId} - NIE ISTNIEJE`)
      }
    }
    
  } catch (error) {
    console.error('❌ Błąd:', error)
  }
}

checkTeacherIds()
