#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
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

function getLocalMigrations() {
  const dir = path.join(process.cwd(), 'supabase', 'migrations')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'))
  const map = new Map()
  for (const f of files) {
    const m = f.match(/^(\d+)_?.*\.sql$/)
    if (m) map.set(m[1], f)
  }
  return map
}

async function main() {
  const client = new Client({ connectionString: conn, application_name: 'wtl_repair_history' })
  await client.connect()
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS supabase_migrations;')
    await client.query('CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text PRIMARY KEY, statements text[], name text);')

    const { rows } = await client.query('SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version')
    const remote = new Map(rows.map(r => [r.version, r.name || null]))
    const local = getLocalMigrations()

    const remoteNotLocal = Array.from(remote.keys()).filter(v => !local.has(v))
    const localNotRemote = Array.from(local.keys()).filter(v => !remote.has(v))

    if (remoteNotLocal.length) {
      console.log('Reverting unknown remote versions:', remoteNotLocal)
      await client.query('BEGIN')
      await client.query('DELETE FROM supabase_migrations.schema_migrations WHERE version = ANY($1)', [remoteNotLocal])
      await client.query('COMMIT')
    } else {
      console.log('No unknown remote versions to revert')
    }

    if (localNotRemote.length) {
      console.log('Recording missing local versions as applied:', localNotRemote)
      await client.query('BEGIN')
      for (const v of localNotRemote) {
        const name = local.get(v)
        await client.query('INSERT INTO supabase_migrations.schema_migrations(version,name) VALUES ($1,$2) ON CONFLICT (version) DO NOTHING', [v, name])
      }
      await client.query('COMMIT')
    } else {
      console.log('No missing local versions to record')
    }

    console.log('✅ History repaired')
  } catch (e) {
    console.error('❌ Repair failed:', e.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

