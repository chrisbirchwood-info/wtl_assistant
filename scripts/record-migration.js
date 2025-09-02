#!/usr/bin/env node
const fs = require('fs')
const { Client } = require('pg')
const dotenv = require('dotenv')

for (const p of ['.env.local.active', '.env.prod', '.env.local', '.env']) {
  if (fs.existsSync(p)) { dotenv.config({ path: p }); break }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const pass = process.env.NEXT_PRIVATE_SUPABASE_PASSWD || process.env.SUPABASE_DB_PASSWORD
if (!url || !pass) { console.error('Missing env for Supabase URL or password'); process.exit(1) }
const ref = new URL(url).hostname.split('.')[0]
const enc = encodeURIComponent(pass)
const conn = `postgresql://postgres.${ref}:${enc}@aws-1-eu-north-1.pooler.supabase.com:6543/postgres`

async function main() {
  const client = new Client({ connectionString: conn, application_name: 'wtl_migration_recorder' })
  await client.connect()
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS supabase_migrations;`)
    await client.query(`CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text PRIMARY KEY, statements text[], name text);`)
    await client.query(`INSERT INTO supabase_migrations.schema_migrations(version,name) VALUES ($1,$2) ON CONFLICT (version) DO NOTHING`, ['20250902130000', '20250902130000_rename_notes_to_threads.sql'])
    console.log('✅ Recorded migration version 20250902130000')
  } catch (e) {
    console.error('❌ Error recording migration:', e.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

