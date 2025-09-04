export type GoogleOAuthConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function getGoogleConfigFromEnv(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
  // Prefer explicit env, else infer from Vercel/Next request origin in route using fallback
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || ''

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Google OAuth env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI')
  }
  return { clientId, clientSecret, redirectUri }
}

export function buildGoogleAuthUrl(params: {
  clientId: string
  redirectUri: string
  scope?: string[]
  state?: string
}): string {
  const scope = (params.scope && params.scope.length
    ? params.scope
    : [
        'https://www.googleapis.com/auth/forms.responses.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
      ]
  ).join(' ')

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('access_type', 'offline') // request refresh_token
  url.searchParams.set('prompt', 'consent') // ensure refresh_token each time
  url.searchParams.set('scope', scope)
  if (params.state) url.searchParams.set('state', params.state)
  return url.toString()
}

export async function exchangeCodeForTokens(args: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}): Promise<{ access_token: string; refresh_token?: string; expires_in: number; id_token?: string }>
{
  const body = new URLSearchParams()
  body.set('code', args.code)
  body.set('client_id', args.clientId)
  body.set('client_secret', args.clientSecret)
  body.set('redirect_uri', args.redirectUri)
  body.set('grant_type', 'authorization_code')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${res.status} ${text}`)
  }
  return res.json()
}

export async function refreshAccessToken(args: {
  refresh_token: string
  clientId: string
  clientSecret: string
}): Promise<{ access_token: string; expires_in: number }>
{
  const body = new URLSearchParams()
  body.set('client_id', args.clientId)
  body.set('client_secret', args.clientSecret)
  body.set('refresh_token', args.refresh_token)
  body.set('grant_type', 'refresh_token')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Refresh token failed: ${res.status} ${text}`)
  }
  return res.json()
}

export function extractFormIdFromUrl(urlString: string): string | null {
  try {
    const url = new URL(urlString)
    // Common Google Forms URL: /forms/d/e/<FORM_ID>/viewform
    // Some older/variant: /forms/d/<FORM_ID>/viewform
    const parts = url.pathname.split('/').filter(Boolean)
    const idx = parts.findIndex((p) => p === 'd')
    if (idx !== -1 && parts[idx + 1]) {
      const maybeE = parts[idx + 1]
      if (maybeE === 'e' && parts[idx + 2]) return parts[idx + 2]
      return maybeE
    }
    return null
  } catch {
    return null
  }
}

export async function listFormResponses(args: {
  formId: string
  accessToken: string
  pageToken?: string
}): Promise<{ responses?: any[]; nextPageToken?: string }>
{
  const params = new URLSearchParams()
  params.set('pageSize', '500')
  if (args.pageToken) params.set('pageToken', args.pageToken)
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${args.formId}/responses?${params.toString()}`, {
    headers: { Authorization: `Bearer ${args.accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Forms API error: ${res.status} ${text}`)
  }
  return res.json()
}

