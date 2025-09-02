#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const dotenv = require('dotenv')

// Load env: prefer .env.local.active, then .env.prod, then .env.local
const envCandidates = ['.env.local.active', '.env.prod', '.env.local', '.env']
for (const p of envCandidates) {
  if (fs.existsSync(p)) { dotenv.config({ path: p }); break }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const dbPass = process.env.NEXT_PRIVATE_SUPABASE_PASSWD || process.env.SUPABASE_DB_PASSWORD
if (!supabaseUrl || !dbPass) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PRIVATE_SUPABASE_PASSWD')
  process.exit(1)
}

function getRef(url) {
  try { const u = new URL(url); return u.hostname.split('.')[0] } catch { return null }
}

const ref = getRef(supabaseUrl)
if (!ref) { console.error('Failed to parse project ref from URL'); process.exit(1) }

const encPass = encodeURIComponent(dbPass)
const poolerUrl = `postgresql://postgres.${ref}:${encPass}@aws-1-eu-north-1.pooler.supabase.com:6543/postgres`

async function run(filePath) {
  const abs = path.resolve(filePath)
  if (!fs.existsSync(abs)) { console.error('Migration file not found:', abs); process.exit(1) }
  const sql = fs.readFileSync(abs, 'utf8')

  const client = new Client({ connectionString: poolerUrl, application_name: 'wtl_migration_runner' })
  await client.connect()
  try {
    await client.query('BEGIN')
    // Split SQL into statements; keep DO $$ ... $$ blocks intact
    const lines = sql.split(/\r?\n/)
    const statements = []
    let buf = []
    let inDo = false
    for (const line of lines) {
      const l = line.trim()
      if (!inDo && /^DO\s+\$\$/i.test(l)) {
        inDo = true
        buf.push(line)
        continue
      }
      if (inDo) {
        buf.push(line)
        if (/\$\$;?\s*$/.test(l)) {
          statements.push(buf.join('\n'))
          buf = []
          inDo = false
        }
        continue
      }
      buf.push(line)
      if (/;\s*$/.test(l)) {
        statements.push(buf.join('\n'))
        buf = []
      }
    }
    if (buf.length) statements.push(buf.join('\n'))

    for (const [i, stmt] of statements.entries()) {
      const trimmed = stmt.trim()
      if (!trimmed) continue
      try {
        await client.query(trimmed)
      } catch (e) {
        console.error(`❌ Statement ${i + 1} failed:`)
        console.error(trimmed)
        throw e
      }
    }
    await client.query('COMMIT')
    console.log('✅ Migration executed successfully:', path.basename(abs))
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('❌ Migration failed:', e.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

// Default to our rename migration if no arg provided
const arg = process.argv[2] || 'supabase/migrations/20250902130000_rename_notes_to_threads.sql'
run(arg)
