-- Google Forms OAuth + Survey Responses
create extension if not exists pgcrypto;

create table if not exists public.google_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null default 'google',
  refresh_token text not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create unique index if not exists google_oauth_tokens_user_provider_uidx
  on public.google_oauth_tokens(user_id, provider);

create table if not exists public.survey_responses (
  response_id text primary key,
  teacher_id uuid not null,
  form_id text not null,
  submitted_at timestamptz,
  payload jsonb not null,
  updated_at timestamptz
);

-- RLS is disabled by default; service role writes via server routes.

