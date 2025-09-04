import { NextRequest, NextResponse } from 'next/server'
import { buildGoogleAuthUrl, getGoogleConfigFromEnv } from '@/lib/google-forms'

export async function GET(request: NextRequest) {
  try {
    const { clientId, redirectUri } = getGoogleConfigFromEnv()
    const { searchParams, origin } = new URL(request.url)
    const teacherId = searchParams.get('teacherId') || ''
    const returnTo = searchParams.get('returnTo') || `${origin}/teacher/${teacherId}/surveys`
    const state = new URLSearchParams({ teacherId, returnTo }).toString()

    const url = buildGoogleAuthUrl({ clientId, redirectUri, state })
    return NextResponse.redirect(url)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'OAuth config error' }, { status: 500 })
  }
}

