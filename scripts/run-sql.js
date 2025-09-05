#!/usr/bin/env node

// Execute a SQL file against the production Supabase Postgres via the pooler

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const dotenv = require('dotenv')

// Load env in priority order
const envCandidates = [
  '.env.local.active',
  '.env.prod',
  '.env.local',
  '.env',
]
let loadedEnv = null
for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p })
    loadedEnv = p
    break
  }
}

function usage(msg) {
  if (msg) console.error(msg)
  console.log('Usage: node scripts/run-sql.js -f <path-to-sql-file>')
  process.exit(1)
}

// Parse args
const args = process.argv.slice(2)
let fileArg = null
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '-f' || args[i] === '--file') && args[i + 1]) {
    fileArg = args[i + 1]
    i++
  }
}
if (!fileArg) usage('Missing -f <file>')

const sqlPath = path.resolve(process.cwd(), fileArg)
if (!fs.existsSync(sqlPath)) usage(`File not found: ${sqlPath}`)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const password = process.env.NEXT_PRIVATE_SUPABASE_PASSWD || process.env.SUPABASE_DB_PASSWORD || ''
if (!supabaseUrl || !password) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or NEXT_PRIVATE_SUPABASE_PASSWD')
  process.exit(1)
}

const ref = (() => {
  try {
    const u = new URL(supabaseUrl)
    const host = u.hostname // <ref>.supabase.co
    return host.split('.')[0]
  } catch (_) {
    return null
  }
})()

if (!ref) {
  console.error('Cannot extract project ref from NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

const user = `postgres.${ref}`
const host = 'aws-1-eu-north-1.pooler.supabase.com'
const port = 6543
const database = 'postgres'

const client = new Client({
  host,
  port,
  user,
  password,
  database,
  ssl: { rejectUnauthorized: false },
})

;(async () => {
  try {
    console.log(`Using env file: ${loadedEnv || 'process env'}`)
    console.log(`Connecting to ${user}@${host}:${port}/${database}`)
    await client.connect()
    const raw = fs.readFileSync(sqlPath, 'utf8')
    console.log(`Executing SQL file: ${sqlPath}`)
    // Split into executable chunks: preserve DO $$...$$; blocks intact using regex
    const chunks = []
    // Find DO $$...$$; and CREATE FUNCTION ... $$...$$; blocks in original text
    const matches = []
    const doStartRe = /DO\s+\$\$/gi
    let m
    while ((m = doStartRe.exec(raw)) !== null) {
      const start = m.index
      const end = raw.indexOf('$$;', doStartRe.lastIndex)
      if (end === -1) throw new Error('Unterminated DO $$ block in SQL file')
      matches.push({ start, end: end + 3, label: 'DO' })
    }
    const fnStartRe = /CREATE\s+OR\s+REPLACE\s+FUNCTION/gi
    while ((m = fnStartRe.exec(raw)) !== null) {
      const start = m.index
      const dollarIdx = raw.indexOf('$$', fnStartRe.lastIndex)
      if (dollarIdx === -1) throw new Error('Function body not found ($$)')
      const end = raw.indexOf('$$;', dollarIdx)
      if (end === -1) throw new Error('Unterminated function $$ block in SQL file')
      matches.push({ start, end: end + 3, label: 'FN' })
    }
    // Sort matches by start, then replace from end to start to avoid shifting
    matches.sort((a, b) => a.start - b.start)
    const blocks = []
    let placeholderSql = raw
    for (let i = matches.length - 1; i >= 0; i--) {
      const { start, end, label } = matches[i]
      const token = `__${label}_${i}__`
      const sqlBlock = raw.slice(start, end)
      blocks.unshift({ token, sql: sqlBlock })
      placeholderSql = placeholderSql.slice(0, start) + token + placeholderSql.slice(end)
    }
    // Split remaining by semicolons
    placeholderSql
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(s => {
        // Restore block if token
        const b = blocks.find(b => s.includes(b.token))
        if (b) {
          // A token may be surrounded by other text if comments exist; assume token only
          chunks.push(b.sql)
        } else {
          chunks.push(s + ';')
        }
      })

    await client.query('BEGIN')
    for (const [idx, chunk] of chunks.entries()) {
      const sql = chunk.endsWith(';') ? chunk : chunk + ';'
      // Skip pure comments
      if (/^--/.test(sql.trim())) continue
      try {
        await client.query(sql)
      } catch (e) {
        console.error(`Failed at chunk #${idx+1}:\n${sql.slice(0, 400)}\n...`)
        throw e
      }
    }
    await client.query('COMMIT')
    console.log(`SQL executed successfully (${chunks.length} statements)`) 
    process.exit(0)
  } catch (err) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('SQL execution failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
})()
