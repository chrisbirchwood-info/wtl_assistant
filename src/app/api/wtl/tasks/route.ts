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

    console.log('Fetching tasks from WTL API...', projectId ? `for project ${projectId}` : 'all tasks')

    // Najpierw spróbuj WTL API (prawdziwe dane)
    const wtlResponse = await wtlClient.getTasks(projectId || undefined)
    if (wtlResponse.success && wtlResponse.data && wtlResponse.data.length > 0) {
      console.log('Successfully fetched from WTL API:', wtlResponse.data.length, 'tasks')
      
      // Opcjonalnie cache w Supabase
      try {
        const tasksToCache = wtlResponse.data.map((task: any) => ({
          project_id: task.project_id || task.projectId || projectId || '1',
          title: task.title || task.name || 'Unnamed Task',
          description: task.description || task.summary,
          status: task.status || 'pending',
          priority: task.priority || 'medium',
          wtl_task_id: task.id || task.task_id,
          assigned_to: task.assigned_to || task.assignedTo,
          due_date: task.due_date || task.dueDate,
          created_at: task.created_at || task.createdAt || new Date().toISOString(),
          updated_at: task.updated_at || task.updatedAt || new Date().toISOString()
        }))

        await supabase
          .from('tasks')
          .upsert(tasksToCache, { onConflict: 'wtl_task_id' })
        
        console.log('Cached tasks in Supabase')
      } catch (cacheError) {
        console.log('Failed to cache in Supabase:', cacheError)
      }

      return NextResponse.json({
        success: true,
        data: wtlResponse.data,
        source: 'wtl',
        message: 'Data loaded from Web To Learn API'
      })
    }

    console.log('WTL API failed, trying Supabase cache...')

    // Jeśli WTL nie działa, spróbuj cache z Supabase
    let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })
    
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: tasks } = await query

    if (tasks && tasks.length > 0) {
      console.log('Using cached data from Supabase:', tasks.length, 'tasks')
      return NextResponse.json({
        success: true,
        data: tasks,
        source: 'supabase',
        message: 'Data loaded from cache'
      })
    }

    console.log('No cached data, using mock data')

    // Fallback do mock danych (filter by projectId if provided)
    const filteredTasks = projectId 
      ? mockTasks.filter(task => task.project_id === projectId)
      : mockTasks

    return NextResponse.json({
      success: true,
      data: filteredTasks,
      source: 'mock',
      message: 'Using demo data - WTL API not available'
    })

  } catch (error) {
    console.error('Tasks API error:', error)
    return NextResponse.json({
      success: true,
      data: mockTasks,
      source: 'mock',
      message: 'Error occurred, using demo data'
    })
  }
}
