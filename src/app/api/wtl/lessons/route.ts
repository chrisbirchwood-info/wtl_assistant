import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import wtlClient from '@/lib/wtl-client'

// Mock data for development - różne lekcje dla różnych kursów
const mockLessonsData: { [key: string]: any[] } = {
  '1': [
    { id: '1', training_id: '1', name: 'Wprowadzenie do przykładowego szkolenia', order: 1, duration: '15 min', type: 'video', status: 'published' },
    { id: '2', training_id: '1', name: 'Podstawy teoretyczne', order: 2, duration: '25 min', type: 'text', status: 'published' },
    { id: '3', training_id: '1', name: 'Test końcowy', order: 3, duration: '10 min', type: 'quiz', status: 'published' }
  ],
  '2': [
    { id: '4', training_id: '2', name: 'Dzień 1: Przełamywanie barier mentalnych', order: 1, duration: '20 min', type: 'video', status: 'published' },
    { id: '5', training_id: '2', name: 'Dzień 2: Techniki mówienia', order: 2, duration: '30 min', type: 'video', status: 'published' },
    { id: '6', training_id: '2', name: 'Dzień 3: Praktyczne ćwiczenia', order: 3, duration: '25 min', type: 'exercise', status: 'published' },
    { id: '7', training_id: '2', name: 'Dzień 4: Konwersacje', order: 4, duration: '35 min', type: 'video', status: 'published' },
    { id: '8', training_id: '2', name: 'Dzień 5: Podsumowanie i test', order: 5, duration: '15 min', type: 'quiz', status: 'published' }
  ],
  '3': [
    { id: '9', training_id: '3', name: 'AI w nauce języków', order: 1, duration: '40 min', type: 'video', status: 'published' },
    { id: '10', training_id: '3', name: 'Techniki pamięciowe', order: 2, duration: '35 min', type: 'video', status: 'published' },
    { id: '11', training_id: '3', name: 'Praktyczne zastosowanie AI', order: 3, duration: '45 min', type: 'exercise', status: 'published' },
    { id: '12', training_id: '3', name: 'Budowanie pewności siebie', order: 4, duration: '30 min', type: 'video', status: 'published' }
  ]
}

const getAllMockLessons = () => {
  return Object.values(mockLessonsData).flat()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trainingId = searchParams.get('trainingId')

    console.log('Fetching lessons from WTL API...', trainingId ? `for training ${trainingId}` : 'all lessons')

    // Najpierw spróbuj WTL API (prawdziwe dane)
    const wtlResponse = await wtlClient.getLessons(trainingId || undefined)
    if (wtlResponse.success && wtlResponse.data && wtlResponse.data.length > 0) {
      console.log('Successfully fetched from WTL API:', wtlResponse.data.length, 'lessons')
      
      // Opcjonalnie cache w Supabase
      try {
        const lessonsToCache = wtlResponse.data.map((lesson: any) => ({
          training_id: lesson.training_id || lesson.trainingId || trainingId || '1',
          name: lesson.name || lesson.title || 'Unnamed Lesson',
          description: lesson.description || lesson.summary,
          order: lesson.order || lesson.position || 1,
          duration: lesson.duration || lesson.time,
          type: lesson.type || 'content',
          status: lesson.status || 'published',
          wtl_lesson_id: lesson.id || lesson.lesson_id,
          created_at: lesson.created_at || lesson.createdAt || new Date().toISOString(),
          updated_at: lesson.updated_at || lesson.updatedAt || new Date().toISOString()
        }))

        await supabase
          .from('lessons')
          .upsert(lessonsToCache, { onConflict: 'wtl_lesson_id' })
        
        console.log('Cached lessons in Supabase')
      } catch (cacheError) {
        console.log('Failed to cache lessons in Supabase:', cacheError)
      }

      return NextResponse.json({
        success: true,
        data: wtlResponse.data,
        source: 'wtl',
        message: 'Lessons loaded from Web To Learn API'
      })
    }

    console.log('WTL API failed, trying Supabase cache...')

    // Jeśli WTL nie działa, spróbuj cache z Supabase
    let query = supabase.from('lessons').select('*').order('order', { ascending: true })
    
    if (trainingId) {
      query = query.eq('training_id', trainingId)
    }

    const { data: lessons } = await query

    if (lessons && lessons.length > 0) {
      console.log('Using cached lessons from Supabase:', lessons.length, 'lessons')
      return NextResponse.json({
        success: true,
        data: lessons,
        source: 'supabase',
        message: 'Lessons loaded from cache'
      })
    }

    console.log('No cached lessons, using mock data')

    // Fallback do mock danych (filter by trainingId if provided)
    const filteredLessons = trainingId 
      ? mockLessonsData[trainingId] || []
      : getAllMockLessons()

    return NextResponse.json({
      success: true,
      data: filteredLessons,
      source: 'mock',
      message: `Using demo lessons for training ${trainingId || 'all'} - WTL API not available`
    })

  } catch (error) {
    console.error('Lessons API error:', error)
    const { searchParams } = new URL(request.url)
    const trainingId = searchParams.get('trainingId')
    
    return NextResponse.json({
      success: true,
      data: trainingId ? mockLessonsData[trainingId] || [] : getAllMockLessons(),
      source: 'mock',
      message: 'Error occurred, using demo lessons'
    })
  }
}
