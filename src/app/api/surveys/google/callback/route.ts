import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exchangeCodeForTokens, getGoogleConfigFromEnv } from '@/lib/google-forms'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') || ''
  const error = searchParams.get('error')

  const stateParams = new URLSearchParams(state)
  const teacherId = stateParams.get('teacherId') || ''
  const returnTo = stateParams.get('returnTo') || `${origin}/teacher/${teacherId}/surveys`

  // Check if this is a mobile browser
  const userAgent = request.headers.get('user-agent') || ''
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent)

  if (error) {
    const redirectResponse = NextResponse.redirect(`${returnTo}?google=error&message=${encodeURIComponent(error)}`)
    if (isMobile) {
      redirectResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    }
    return redirectResponse
  }
  if (!code) {
    const redirectResponse = NextResponse.redirect(`${returnTo}?google=error&message=missing_code`)
    if (isMobile) {
      redirectResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    }
    return redirectResponse
  }

  try {
    const { clientId, clientSecret, redirectUri } = getGoogleConfigFromEnv()
    const tokens = await exchangeCodeForTokens({ code, clientId, clientSecret, redirectUri })

    // Persist refresh_token for this teacher
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.redirect(`${returnTo}?google=error&message=${encodeURIComponent('Missing Supabase server env')}`)
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const refreshToken = tokens.refresh_token
    if (!refreshToken) {
      return NextResponse.redirect(`${returnTo}?google=error&message=${encodeURIComponent('No refresh_token returned (ensure prompt=consent & access_type=offline)')}`)
    }

    // upsert into google_oauth_tokens (user_id, provider, refresh_token, scope)
    const { error: upsertError } = await supabase
      .from('google_oauth_tokens')
      .upsert({
        user_id: teacherId,
        provider: 'google',
        refresh_token: refreshToken,
        scope: 'forms.responses.readonly userinfo.email',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' })

    if (upsertError) {
      const redirectResponse = NextResponse.redirect(`${returnTo}?google=error&message=${encodeURIComponent('Failed to save token: ' + upsertError.message)}`)
      if (isMobile) {
        redirectResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      }
      return redirectResponse
    }

    const successResponse = NextResponse.redirect(`${returnTo}?google=connected`)
    if (isMobile) {
      successResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    }
    return successResponse
  } catch (e: any) {
    const errorResponse = NextResponse.redirect(`${returnTo}?google=error&message=${encodeURIComponent(e.message || 'Unknown error')}`)
    if (isMobile) {
      errorResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    }
    return errorResponse
  }
}

