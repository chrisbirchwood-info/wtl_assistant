import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { searchParams } = new URL(request.url)
    
    const teacherId = searchParams.get('teacher_id')
    const formId = searchParams.get('form_id')
    const includeLinked = searchParams.get('include_linked') === 'true'
    
    if (!teacherId) {
      return NextResponse.json({ error: 'Missing teacher_id parameter' }, { status: 400 })
    }
    
    // Build query to get survey responses
    let query = supabase
      .from('survey_responses')
      .select(`
        *,
        survey_forms!inner(
          form_id,
          title,
          teacher_id
        ),
        survey_answers(
          id,
          question_id,
          question_text,
          question_type,
          answer_text,
          answer_value
        ),
        thread_survey_connections(
          id,
          thread_id,
          connection_type,
          created_at,
          threads(
            id,
            title,
            user_id
          )
        )
      `)
      .eq('survey_forms.teacher_id', teacherId)
      .order('submitted_at', { ascending: false })
    
    if (formId) {
      query = query.eq('form_id', formId)
    }
    
    const { data: responses, error } = await query
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Filter out already linked responses if requested
    const filteredResponses = includeLinked 
      ? responses 
      : responses?.filter(response => 
          !response.thread_survey_connections || 
          response.thread_survey_connections.length === 0
        )
    
    // Get student information for each response
    const responsesWithStudents = await Promise.all(
      (filteredResponses || []).map(async (response) => {
        let student = null
        
        if (response.respondent_email) {
          const { data: studentData } = await supabase
            .from('users')
            .select('id, email, first_name, last_name')
            .eq('email', response.respondent_email)
            .single()
          
          student = studentData
        }
        
        return {
          ...response,
          student,
          is_linked: response.thread_survey_connections && response.thread_survey_connections.length > 0,
          linked_thread: response.thread_survey_connections?.[0]?.threads || null
        }
      })
    )
    
    // Group by form for easier UI handling
    const responsesByForm = responsesWithStudents.reduce((acc, response) => {
      const formId = response.form_id
      if (!acc[formId]) {
        acc[formId] = {
          form: response.survey_forms,
          responses: []
        }
      }
      acc[formId].responses.push(response)
      return acc
    }, {} as Record<string, any>)
    
    return NextResponse.json({ 
      responses: responsesWithStudents,
      by_form: responsesByForm,
      total: responsesWithStudents.length
    })
  } catch (error: any) {
    console.error('Error in survey responses API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// Get detailed response with all answers
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const body = await request.json()
    
    const { response_id, teacher_id } = body
    
    if (!response_id || !teacher_id) {
      return NextResponse.json({ error: 'Missing response_id or teacher_id' }, { status: 400 })
    }
    
    // Get detailed response data
    const { data: response, error } = await supabase
      .from('survey_responses')
      .select(`
        *,
        survey_forms!inner(
          form_id,
          title,
          description,
          teacher_id,
          questions
        ),
        survey_answers(
          id,
          question_id,
          question_text,
          question_type,
          answer_text,
          answer_value,
          created_at
        ),
        thread_survey_connections(
          id,
          thread_id,
          connection_type,
          created_at,
          threads(
            id,
            title,
            content,
            user_id,
            created_at,
            updated_at
          )
        )
      `)
      .eq('id', response_id)
      .eq('survey_forms.teacher_id', teacher_id)
      .single()
    
    if (error || !response) {
      return NextResponse.json({ error: 'Survey response not found or unauthorized' }, { status: 404 })
    }
    
    // Get student information
    let student = null
    if (response.respondent_email) {
      const { data: studentData } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('email', response.respondent_email)
        .single()
      
      student = studentData
    }
    
    return NextResponse.json({
      response: {
        ...response,
        student,
        is_linked: response.thread_survey_connections && response.thread_survey_connections.length > 0,
        linked_thread: response.thread_survey_connections?.[0]?.threads || null
      }
    })
  } catch (error: any) {
    console.error('Error in survey response details API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
