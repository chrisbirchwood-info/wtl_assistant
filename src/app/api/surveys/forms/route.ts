import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const body = await request.json()
    
    const { form_id, teacher_id, title, description, source_link } = body
    
    if (!form_id || !teacher_id) {
      return NextResponse.json({ error: 'Missing form_id or teacher_id' }, { status: 400 })
    }
    
    // Insert form into database
    const { data: form, error } = await supabase
      .from('survey_forms')
      .insert({
        form_id,
        teacher_id,
        title: title || `Ankieta ${form_id.substring(0, 8)}...`,
        description: description || null,
        questions: null,
        total_responses: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      form,
      message: 'Survey form added to database'
    })
  } catch (error: any) {
    console.error('Error in survey forms POST API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
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
    
    const teacherId = searchParams.get('teacher_id')
    
    if (!teacherId) {
      return NextResponse.json({ error: 'Missing teacher_id parameter' }, { status: 400 })
    }
    
    // Get all survey forms for the teacher
    const { data: forms, error } = await supabase
      .from('survey_forms')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      forms: forms || [],
      total: forms?.length || 0
    })
  } catch (error: any) {
    console.error('Error in survey forms API:', error)
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

    const teacherId = searchParams.get('teacher_id')
    const formId = searchParams.get('form_id')

    if (!teacherId || !formId) {
      return NextResponse.json({ error: 'Missing teacher_id or form_id parameter' }, { status: 400 })
    }

    // Ensure form belongs to teacher
    const { data: formRow, error: formErr } = await supabase
      .from('survey_forms')
      .select('form_id, teacher_id')
      .eq('form_id', formId)
      .eq('teacher_id', teacherId)
      .maybeSingle()

    if (formErr) {
      return NextResponse.json({ error: formErr.message }, { status: 500 })
    }
    if (!formRow) {
      return NextResponse.json({ error: 'Form not found or unauthorized' }, { status: 404 })
    }

    // 1) Remove thread connections for this form
    const { error: connErr } = await supabase
      .from('thread_survey_connections')
      .delete()
      .eq('form_id', formId)

    if (connErr) {
      return NextResponse.json({ error: connErr.message }, { status: 500 })
    }

    // 2) Remove responses (answers cascade on delete)
    const { error: respErr } = await supabase
      .from('survey_responses')
      .delete()
      .eq('form_id', formId)

    if (respErr) {
      return NextResponse.json({ error: respErr.message }, { status: 500 })
    }

    // 3) Remove the form itself
    const { error: formDelErr } = await supabase
      .from('survey_forms')
      .delete()
      .eq('form_id', formId)
      .eq('teacher_id', teacherId)

    if (formDelErr) {
      return NextResponse.json({ error: formDelErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting survey form:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
