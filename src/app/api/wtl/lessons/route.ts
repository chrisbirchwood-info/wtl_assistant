import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import wtlClient from '@/lib/wtl-client'

// Mock data for development
const mockLessons = [
  { 
    id: '1', 
    training_id: '1',
    name: 'Wprowadzenie do kursu', 
    description: 'Pierwsza lekcja wprowadzająca do tematyki kursu',
    order: 1,
    duration: '15 min',
    type: 'video',
    status: 'published',
    created_at: '2024-01-01T00:00:00Z'
  },
  { 
    id: '2', 
    training_id: '1',
    name: 'Podstawy teoretyczne', 
    description: 'Omówienie podstawowych zagadnień teoretycznych',
    order: 2,
    duration: '25 min',
    type: 'text',
    status: 'published',
    created_at: '2024-01-02T00:00:00Z'
  },
  { 
    id: '3', 
    training_id: '2',
    name: 'Ćwiczenia praktyczne', 
    description: 'Zadania praktyczne do wykonania',
    order: 1,
    duration: '30 min',
    type: 'exercise',
    status: 'published',
    created_at: '2024-01-10T00:00:00Z'
  }
]

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
      ? mockLessons.filter(lesson => lesson.training_id === trainingId)
      : mockLessons

    return NextResponse.json({
      success: true,
      data: filteredLessons,
      source: 'mock',
      message: 'Using demo lessons - WTL API not available'
    })

  } catch (error) {
    console.error('Lessons API error:', error)
    return NextResponse.json({
      success: true,
      data: mockLessons,
      source: 'mock',
      message: 'Error occurred, using demo lessons'
    })
  }
}
