# 🗄️ Supabase Configuration

## Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note down your project URL and API keys

### 2. Environment Variables
Add these to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Database Schema
Run the migration in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor.

## Tables

### `users`
- `id` - UUID primary key
- `email` - Unique email address
- `username` - Optional username
- `created_at` - Timestamp
- `updated_at` - Auto-updated timestamp

### `user_sessions`
- `id` - UUID primary key
- `user_id` - Reference to users table
- `session_token` - JWT token
- `expires_at` - Token expiration
- `created_at` - Timestamp

## Functions

- `createUser()` - Create new user
- `getUserByEmail()` - Find user by email
- `saveUserSession()` - Save session data

## Security

- Row Level Security (RLS) enabled by default
- Users can only access their own data
- Sessions are automatically cleaned up on expiration
