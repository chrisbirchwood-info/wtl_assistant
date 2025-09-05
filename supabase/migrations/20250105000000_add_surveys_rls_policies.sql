-- Add RLS policies for surveys tables

-- First ensure tables exist (defensive approach)
CREATE TABLE IF NOT EXISTS public.google_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null default 'google',
  refresh_token text not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS google_oauth_tokens_user_provider_uidx
  ON public.google_oauth_tokens(user_id, provider);
CREATE TABLE IF NOT EXISTS public.survey_responses (
  response_id text primary key,
  teacher_id uuid not null,
  form_id text not null,
  submitted_at timestamptz,
  payload jsonb not null,
  updated_at timestamptz
);
-- Enable RLS on google_oauth_tokens
ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;
-- Policy: Users can only see their own OAuth tokens
CREATE POLICY "Users can view their own oauth tokens" ON public.google_oauth_tokens
  FOR SELECT USING (auth.uid() = user_id);
-- Policy: Users can insert their own OAuth tokens
CREATE POLICY "Users can insert their own oauth tokens" ON public.google_oauth_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Policy: Users can update their own OAuth tokens
CREATE POLICY "Users can update their own oauth tokens" ON public.google_oauth_tokens
  FOR UPDATE USING (auth.uid() = user_id);
-- Policy: Users can delete their own OAuth tokens
CREATE POLICY "Users can delete their own oauth tokens" ON public.google_oauth_tokens
  FOR DELETE USING (auth.uid() = user_id);
-- Enable RLS on survey_responses
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
-- Policy: Teachers can only see responses from their own forms
CREATE POLICY "Teachers can view their own survey responses" ON public.survey_responses
  FOR SELECT USING (auth.uid() = teacher_id);
-- Policy: Teachers can insert responses for their own forms
CREATE POLICY "Teachers can insert their own survey responses" ON public.survey_responses
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);
-- Policy: Teachers can update responses for their own forms
CREATE POLICY "Teachers can update their own survey responses" ON public.survey_responses
  FOR UPDATE USING (auth.uid() = teacher_id);
-- Policy: Teachers can delete responses for their own forms
CREATE POLICY "Teachers can delete their own survey responses" ON public.survey_responses
  FOR DELETE USING (auth.uid() = teacher_id);
-- Note: Superadmin policies will be added after users table is created in later migration;
