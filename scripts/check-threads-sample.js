#!/usr/bin/env node
const fs = require('fs')
const { Client } = require('pg')
const dotenv = require('dotenv')

for (const p of ['.env.local.active', '.env.prod', '.env.local', '.env']) {
  if (fs.existsSync(p)) { dotenv.config({ path: p }); break }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const pass = process.env.NEXT_PRIVATE_SUPABASE_PASSWD || process.env.SUPABASE_DB_PASSWORD
if (!url || !pass) { console.error('Missing env NEXT_PUBLIC_SUPABASE_URL or NEXT_PRIVATE_SUPABASE_PASSWD'); process.exit(1) }
const ref = new URL(url).hostname.split('.')[0]
const enc = encodeURIComponent(pass)
const conn = `postgresql://postgres.${ref}:${enc}@aws-1-eu-north-1.pooler.supabase.com:6543/postgres`

async function main() {
  const client = new Client({ connectionString: conn, application_name: 'wtl_threads_check' })
  await client.connect()
  try {
    const { rows: cnt } = await client.query('SELECT COUNT(*)::int AS count FROM public.threads')
    const { rows: sample } = await client.query(`
      SELECT t.id, t.title, t.user_id, t.created_at, COALESCE(COUNT(c.id),0) AS connections
      FROM public.threads t
      LEFT JOIN public.thread_lesson_connections c ON c.thread_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `)
    console.log('Threads total:', cnt[0]?.count || 0)
    console.log('Recent threads:')
    for (const r of sample) {
      console.log(` - ${r.id} | ${r.title} | user ${r.user_id} | ${r.connections} connections`)
    }
  } catch (e) {
    console.error('Check failed:', e.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

