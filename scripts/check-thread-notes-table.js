#!/usr/bin/env node
const { Client } = require('pg')
const fs = require('fs')
const dotenv = require('dotenv')

for (const p of ['.env.local.active', '.env.prod', '.env.local', '.env']) {
  if (fs.existsSync(p)) { dotenv.config({ path: p }); break }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const pass = process.env.NEXT_PRIVATE_SUPABASE_PASSWD || process.env.SUPABASE_DB_PASSWORD
if (!url || !pass) { console.error('Missing env'); process.exit(1) }
const ref = new URL(url).hostname.split('.')[0]

const client = new Client({
  host: 'aws-1-eu-north-1.pooler.supabase.com',
  port: 6543,
  user: `postgres.${ref}`,
  password: pass,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
})

;(async () => {
  await client.connect()
  try {
    const res = await client.query(`SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name='thread_notes'
    ) AS exists;`)
    console.log('thread_notes exists:', res.rows[0].exists)
  } finally {
    await client.end()
  }
})().catch(e => { console.error(e.message); process.exit(1) })

