import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(_request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    
    // Use the database function to sync waiting connections
    const { data: result, error: syncError } = await supabase
      .rpc('sync_waiting_survey_connections')
    
    if (syncError) {
      return NextResponse.json({ error: syncError.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      ...result,
      message: `Synchronized ${result.updated_connections} connections`
    })
  } catch (error: any) {
    console.error('Error in survey connections sync API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
