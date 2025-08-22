import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import wtlClient from '@/lib/wtl-client'

// Mock data for development
const mockProjects = [
  { 
    id: '1', 
    name: 'Projekt Demo WTL', 
    description: 'Przykładowy projekt demonstracyjny', 
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  { 
    id: '2', 
    name: 'Integracja API', 
    description: 'Projekt integracji z zewnętrznym API', 
    status: 'in_progress',
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z'
  },
  { 
    id: '3', 
    name: 'Dashboard Analytics', 
    description: 'Rozbudowa dashboardu o analitykę', 
    status: 'completed',
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-25T00:00:00Z'
  }
]

export async function GET() {
  try {
    // Try to get from Supabase first
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (projects && projects.length > 0) {
      return NextResponse.json({
        success: true,
        data: projects,
        source: 'supabase'
      })
    }

    // Try WTL API
    const wtlResponse = await wtlClient.getProjects()
    if (wtlResponse.success) {
      return NextResponse.json({
        success: true,
        data: wtlResponse.data,
        source: 'wtl'
      })
    }

    // Fallback to mock data
    return NextResponse.json({
      success: true,
      data: mockProjects,
      source: 'mock'
    })

  } catch (error) {
    console.error('Projects API error:', error)
    return NextResponse.json({
      success: true,
      data: mockProjects,
      source: 'mock'
    })
  }
}
