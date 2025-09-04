import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractFormIdFromUrl, getGoogleConfigFromEnv, listFormResponses, refreshAccessToken } from '@/lib/google-forms'

type Body = { teacherId: string; formId?: string; link?: string }

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase env' }, { status: 500 })
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const body = (await request.json()) as Body
    const teacherId = body.teacherId
    const formId = body.formId || (body.link ? extractFormIdFromUrl(body.link) : null)
    if (!teacherId || !formId) {
      return NextResponse.json({ error: 'Missing teacherId or formId/link' }, { status: 400 })
    }

    // Load refresh_token for teacher
    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .select('refresh_token')
      .eq('user_id', teacherId)
      .eq('provider', 'google')
      .single()

    if (tokenError || !tokenRow?.refresh_token) {
      return NextResponse.json({ error: 'Google not connected for this teacher' }, { status: 400 })
    }

    const { clientId, clientSecret } = getGoogleConfigFromEnv()
    const refreshed = await refreshAccessToken({
      refresh_token: tokenRow.refresh_token,
      clientId,
      clientSecret,
    })

    // Fetch responses with pagination
    const responses: any[] = []
    let pageToken: string | undefined = undefined
    do {
      const page = await listFormResponses({ formId, accessToken: refreshed.access_token, pageToken })
      if (page.responses?.length) responses.push(...page.responses)
      pageToken = page.nextPageToken
    } while (pageToken)

    // Store responses in original format (backward compatible)
    const mapped = responses.map((r: any) => ({
      response_id: r.responseId,
      teacher_id: teacherId,
      form_id: formId,
      submitted_at: r.lastSubmittedTime || r.createTime || new Date().toISOString(),
      payload: r,
      updated_at: new Date().toISOString(),
    }))

    if (mapped.length > 0) {
      const { error: upsertError } = await supabase
        .from('survey_responses')
        .upsert(mapped, { onConflict: 'response_id' })
      if (upsertError) {
        return NextResponse.json({ error: 'Failed to save responses', details: upsertError.message }, { status: 500 })
      }
    }

    // TODO: Add structured storage after migration is applied
    // This will be enhanced with the new flexible structure

    return NextResponse.json({ 
      ok: true, 
      formId,
      syncedAt: new Date().toISOString(),
      count: mapped.length,
      totalResponses: responses.length
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 })
  }
}

