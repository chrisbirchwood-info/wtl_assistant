import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import wtlClient from '@/lib/wtl-client'

// Mock data for development
const mockTasks = [
  { 
    id: '1', 
    project_id: '1', 
    title: 'Konfiguracja środowiska', 
    description: 'Przygotowanie środowiska deweloperskiego', 
    status: 'completed', 
    priority: 'high',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  },
  { 
    id: '2', 
    project_id: '1', 
    title: 'Implementacja API', 
    description: 'Stworzenie endpointów REST API', 
    status: 'in_progress', 
    priority: 'urgent',
    due_date: '2024-02-01T00:00:00Z',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  { 
    id: '3', 
    project_id: '2', 
    title: 'Testy integracyjne', 
    description: 'Napisanie testów dla integracji', 
    status: 'pending', 
    priority: 'medium',
    due_date: '2024-02-15T00:00:00Z',
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z'
  },
  { 
    id: '4', 
    project_id: '3', 
    title: 'Wizualizacja danych', 
    description: 'Dodanie wykresów i grafów', 
    status: 'completed', 
    priority: 'low',
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    // Try to get from Supabase first
    let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })
    
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: tasks, error } = await query

    if (tasks && tasks.length > 0) {
      return NextResponse.json({
        success: true,
        data: tasks,
        source: 'supabase'
      })
    }

    // Try WTL API
    const wtlResponse = await wtlClient.getTasks(projectId || undefined)
    if (wtlResponse.success) {
      return NextResponse.json({
        success: true,
        data: wtlResponse.data,
        source: 'wtl'
      })
    }

    // Fallback to mock data (filter by projectId if provided)
    const filteredTasks = projectId 
      ? mockTasks.filter(task => task.project_id === projectId)
      : mockTasks

    return NextResponse.json({
      success: true,
      data: filteredTasks,
      source: 'mock'
    })

  } catch (error) {
    console.error('Tasks API error:', error)
    return NextResponse.json({
      success: true,
      data: mockTasks,
      source: 'mock'
    })
  }
}
