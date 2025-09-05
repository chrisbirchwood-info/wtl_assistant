import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacher_id') || ''
    if (!teacherId) {
      return NextResponse.json({ error: 'Missing teacher_id' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await supabase
      .from('google_oauth_tokens')
      .select('updated_at')
      .eq('user_id', teacherId)
      .eq('provider', 'google')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ connected: !!data, updated_at: data?.updated_at || null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}

