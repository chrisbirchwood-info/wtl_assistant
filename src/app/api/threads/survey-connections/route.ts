import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LinkThreadToSurveyRequest } from '@/types/threads'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const body = await request.json() as LinkThreadToSurveyRequest
    
    if (!body.thread_id || !body.form_id || !body.teacher_id) {
      return NextResponse.json({ error: 'Missing required fields: thread_id, form_id, teacher_id' }, { status: 400 })
    }
    
    const response = await linkThreadToSurveyForm(supabase, body, request)
    return response
  } catch (error: any) {
    console.error('Error in survey connections API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

async function linkThreadToSurveyForm(
  supabase: any,
  requestBody: LinkThreadToSurveyRequest,
  request: NextRequest
): Promise<NextResponse> {
  const { thread_id, form_id, teacher_id } = requestBody
  
  // Verify that the form exists and belongs to teacher
  const { data: formData, error: formError } = await supabase
    .from('survey_forms')
    .select('*')
    .eq('form_id', form_id)
    .eq('teacher_id', teacher_id)
    .single()
  
  if (formError || !formData) {
    return NextResponse.json({ error: 'Survey form not found or unauthorized' }, { status: 404 })
  }
  
  // Use the database function to link thread to survey form
  const { data: result, error: linkError } = await supabase
    .rpc('link_thread_to_survey_form', {
      p_thread_id: thread_id,
      p_form_id: form_id,
      p_teacher_id: teacher_id
    })
  
  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  // Trigger Google sync for this form so that detailed answers are fetched
  try {
    const { origin } = new URL(request.url)
    await fetch(`${origin}/api/surveys/google/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId: teacher_id, formId: form_id }),
    })
  } catch (e) {
    // Non-fatal: linking succeeded; answers will appear after manual sync
    console.error('Failed to trigger Google sync from linker:', (e as any)?.message || e)
  }
  
  return NextResponse.json({ 
    success: true, 
    result,
    message: result.has_response 
      ? 'Thread linked to survey form with existing response' 
      : 'Thread linked to survey form - waiting for response'
  })
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { searchParams } = new URL(request.url)
    
    const threadId = searchParams.get('thread_id')
    const responseId = searchParams.get('response_id')
    
    if (threadId) {
      // Get survey data for a specific thread
      const { data, error } = await supabase
        .rpc('get_thread_survey_data', { p_thread_id: threadId })
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      return NextResponse.json({ survey_data: data })
    } else if (responseId) {
      // Get thread connected to a specific survey response
      const { data: connectionData, error } = await supabase
        .from('thread_survey_connections')
        .select(`
          *,
          threads (
            id,
            title,
            content,
            user_id,
            created_at,
            updated_at
          )
        `)
        .eq('survey_response_id', responseId)
        .single()
      
      if (error) {
        return NextResponse.json({ error: 'No thread found for this survey response' }, { status: 404 })
      }
      
      return NextResponse.json({ connection: connectionData })
    } else {
      return NextResponse.json({ error: 'Missing thread_id or response_id parameter' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error in survey connections GET API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { searchParams } = new URL(request.url)
    
    const connectionId = searchParams.get('connection_id')
    const threadId = searchParams.get('thread_id')
    const responseId = searchParams.get('response_id')
    
    let query = supabase.from('thread_survey_connections').delete()
    
    if (connectionId) {
      query = query.eq('id', connectionId)
    } else if (threadId && responseId) {
      query = query.eq('thread_id', threadId).eq('survey_response_id', responseId)
    } else {
      return NextResponse.json({ error: 'Missing connection_id or both thread_id and response_id' }, { status: 400 })
    }
    
    const { error } = await query
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Survey connection deleted'
    })
  } catch (error: any) {
    console.error('Error in survey connections DELETE API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
