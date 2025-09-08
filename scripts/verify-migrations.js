#!/usr/bin/env node
const fs = require('fs')
const dotenv = require('dotenv')
const { Client } = require('pg')

for (const p of ['.env.local.active', '.env.prod', '.env.local', '.env']) {
  if (fs.existsSync(p)) { dotenv.config({ path: p }); break }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const pass = process.env.NEXT_PRIVATE_SUPABASE_PASSWD || process.env.SUPABASE_DB_PASSWORD
if (!url || !pass) { console.error('Missing env'); process.exit(1) }
const ref = new URL(url).hostname.split('.')[0]
const enc = encodeURIComponent(pass)
const conn = `postgresql://postgres.${ref}:${enc}@aws-1-eu-north-1.pooler.supabase.com:6543/postgres`

;(async () => {
  const client = new Client({ connectionString: conn, application_name: 'wtl_verify_migrations', ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const want = ['20250906170000', '20250907120000']
    const res = await client.query('SELECT version FROM supabase_migrations.schema_migrations WHERE version = ANY($1::text[]) ORDER BY version', [want])
    console.log('Recorded versions:', res.rows.map(r => r.version))

    const col = await client.query(`SELECT EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='thread_notes' AND column_name='visibility'
    ) AS ok`)
    console.log('thread_notes.visibility exists:', col.rows[0].ok)

    const tbl = await client.query(`SELECT EXISTS(
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name='lesson_sections'
    ) AS ok`)
    console.log('lesson_sections exists:', tbl.rows[0].ok)
  } finally {
    await client.end()
  }
})().catch(e => { console.error(e.message); process.exit(1) })

