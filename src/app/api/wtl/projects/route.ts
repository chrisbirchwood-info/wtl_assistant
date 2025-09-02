/* eslint-disable @typescript-eslint/no-explicit-any */
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
    console.log('Fetching projects from WTL API...')
    
    // Najpierw spróbuj WTL API (prawdziwe dane)
    const wtlResponse = await wtlClient.getProjects()
    console.log('WTL Response:', wtlResponse)
    
    if (wtlResponse.success && wtlResponse.data) {
      console.log('Successfully fetched from WTL API:', wtlResponse.data.length, 'projects')
      
      // Opcjonalnie cache w Supabase
      try {
        const projectsToCache = wtlResponse.data.map((project: any) => ({
          name: project.name || project.title || 'Unnamed Project',
          description: project.description || project.summary,
          status: project.status || 'active',
          wtl_project_id: project.id || project.project_id,
          created_at: project.created_at || project.createdAt || new Date().toISOString(),
          updated_at: project.updated_at || project.updatedAt || new Date().toISOString()
        }))

        await supabase
          .from('projects')
          .upsert(projectsToCache, { onConflict: 'wtl_project_id' })
        
        console.log('Cached projects in Supabase')
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
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (projects && projects.length > 0) {
      console.log('Using cached data from Supabase:', projects.length, 'projects')
      return NextResponse.json({
        success: true,
        data: projects,
        source: 'supabase',
        message: 'Data loaded from cache'
      })
    }

    console.log('No cached data, using mock data')
    
    // Fallback do mock danych
    return NextResponse.json({
      success: true,
      data: mockProjects,
      source: 'mock',
      message: 'Using demo data - WTL API not available'
    })

  } catch (error) {
    console.error('Projects API error:', error)
    return NextResponse.json({
      success: true,
      data: mockProjects,
      source: 'mock',
      message: 'Error occurred, using demo data'
    })
  }
}
