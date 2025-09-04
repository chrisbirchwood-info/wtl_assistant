Google Forms Sync — Setup (Next.js + Supabase)

Env variables (Vercel/Local)
- GOOGLE_CLIENT_ID: OAuth 2.0 Client ID (Web)
- GOOGLE_CLIENT_SECRET: OAuth 2.0 Client Secret
- GOOGLE_REDIRECT_URI: e.g. https://your-domain.com/api/surveys/google/callback
- NEXT_PUBLIC_SUPABASE_URL: your Supabase URL
- SUPABASE_SERVICE_ROLE_KEY: service role key (server-only)

Google Cloud Console
- Enable the “Google Forms API” for your project.
- Create OAuth consent screen and an OAuth 2.0 Client (Web) with the redirect URI above.

Supabase SQL (simple tables)
-- Token storage (per teacher)
create table if not exists public.google_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null default 'google',
  refresh_token text not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create unique index if not exists google_oauth_tokens_user_provider_uidx on public.google_oauth_tokens(user_id, provider);

-- Responses storage (idempotent upsert by response_id)
create table if not exists public.survey_responses (
  response_id text primary key,
  teacher_id uuid not null,
  form_id text not null,
  submitted_at timestamptz,
  payload jsonb not null,
  updated_at timestamptz
);

Scopes requested
- forms.responses.readonly
- userinfo.email

Flow
1) Teacher pastes Google Form link on page /teacher/[teacherId]/surveys
2) Click “Połącz z Google” → /api/surveys/google/authorize
3) Google redirects to /api/surveys/google/callback → refresh_token saved in Supabase
4) “Odśwież” on a survey item calls POST /api/surveys/google/sync { teacherId, link }
5) Endpoint fetches Forms API responses and upserts into survey_responses

Notes
- Ensure redirect URI matches exactly (Google Cloud → Credentials).
- To always get refresh_token, use prompt=consent, access_type=offline (already set).
- For incremental sync, you can extend sync endpoint to query only new response_ids or filter by time.
