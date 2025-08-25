#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

console.log('🧪 Dodawanie testowych danych...\n')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Brak zmiennych środowiskowych Supabase!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function addTestData() {
  try {
    console.log('🔍 Sprawdzanie istniejących użytkowników...')
    
    // Pobierz istniejących użytkowników
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(10)
    
    if (usersError) {
      throw new Error(`Błąd pobierania użytkowników: ${usersError.message}`)
    }
    
    if (!users || users.length === 0) {
      console.log('❌ Brak użytkowników w bazie')
      return
    }
    
    console.log(`✅ Znaleziono ${users.length} użytkowników`)
    
    // Znajdź nauczyciela i studentów
    const teacher = users.find(u => u.role === 'teacher')
    const students = users.filter(u => u.role === 'student')
    
    if (!teacher) {
      console.log('❌ Brak nauczyciela w bazie')
      return
    }
    
    if (students.length === 0) {
      console.log('❌ Brak studentów w bazie')
      return
    }
    
    console.log(`👨‍🏫 Nauczyciel: ${teacher.email}`)
    console.log(`👥 Studenci: ${students.length}`)
    
    // Dodaj testowy kurs
    console.log('\n📚 Dodawanie testowego kursu...')
    
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert([{
        title: 'Programowanie w JavaScript',
        description: 'Kurs podstaw programowania w JavaScript dla początkujących',
        teacher_id: teacher.id,
        wtl_course_id: 'js-basics-001',
        status: 'active',
        max_students: 30
      }])
      .select()
      .single()
    
    if (courseError) {
      if (courseError.code === '23505') {
        console.log('⚠️  Kurs już istnieje, pobieram istniejący...')
        const { data: existingCourse } = await supabase
          .from('courses')
          .select('*')
          .eq('teacher_id', teacher.id)
          .eq('title', 'Programowanie w JavaScript')
          .single()
        
        if (existingCourse) {
          course = existingCourse
        } else {
          throw new Error('Nie można pobrać istniejącego kursu')
        }
      } else {
        throw new Error(`Błąd tworzenia kursu: ${courseError.message}`)
      }
    }
    
    console.log(`✅ Kurs utworzony: ${course.title} (ID: ${course.id})`)
    
    // Dodaj zapisy studentów na kurs
    console.log('\n📝 Dodawanie zapisów studentów...')
    
    const enrollments = students.slice(0, 5).map((student, index) => ({
      course_id: course.id,
      student_id: student.id,
      enrollment_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Losowa data w ciągu ostatnich 30 dni
      status: 'enrolled',
      progress_percentage: Math.floor(Math.random() * 100), // Losowy postęp 0-100%
      last_activity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() // Losowa aktywność w ciągu ostatnich 7 dni
    }))
    
    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from('course_enrollments')
      .upsert(enrollments, { 
        onConflict: 'course_id,student_id',
        ignoreDuplicates: true 
      })
      .select()
    
    if (enrollmentsError) {
      console.log('⚠️  Błąd dodawania zapisów:', enrollmentsError.message)
      console.log('   Sprawdzam istniejące zapisy...')
      
      const { data: existingEnrollments } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('course_id', course.id)
      
      if (existingEnrollments) {
        console.log(`✅ Znaleziono ${existingEnrollments.length} istniejących zapisów`)
      }
    } else {
      console.log(`✅ Dodano ${enrollmentsData.length} zapisów studentów`)
    }
    
    // Sprawdź końcowy stan
    console.log('\n📊 Sprawdzanie końcowego stanu...')
    
    const { data: finalCourses } = await supabase
      .from('courses')
      .select('*')
      .eq('teacher_id', teacher.id)
    
    const { data: finalEnrollments } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('course_id', course.id)
    
    console.log(`📚 Kursy nauczyciela: ${finalCourses?.length || 0}`)
    console.log(`👥 Zapisani studenci: ${finalEnrollments?.length || 0}`)
    
    console.log('\n✅ Testowe dane zostały dodane pomyślnie!')
    console.log('\n💡 Teraz możesz:')
    console.log('   1. Zalogować się jako nauczyciel')
    console.log('   2. Przejść do "Moi studenci"')
    console.log('   3. Zobaczyć listę studentów na kursie')
    
  } catch (error) {
    console.error('❌ Błąd podczas dodawania testowych danych:', error.message)
  }
}

// Uruchom skrypt
addTestData().then(() => {
  process.exit(0)
}).catch(error => {
  console.error('❌ Skrypt nie powiódł się:', error)
  process.exit(1)
})
