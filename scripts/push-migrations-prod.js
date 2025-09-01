#!/usr/bin/env node

// Push Supabase migrations to PROD using password from .env.prod / .env.local.active

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const dotenv = require('dotenv')

// 1) Load env (prefer .env.local.active -> .env.prod -> .env.local -> .env)
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

console.log(`Using env file: ${loadedEnv || 'process env'}`)

// 2) Resolve project ref (prefer supabase/.temp/project-ref, else from NEXT_PUBLIC_SUPABASE_URL)
function getProjectRef() {
  const refFile = path.join('supabase', '.temp', 'project-ref')
  if (fs.existsSync(refFile)) {
    const ref = fs.readFileSync(refFile, 'utf8').trim()
    if (ref) return ref
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  // Expect https://<ref>.supabase.co
  try {
    const u = new URL(url)
    const host = u.hostname // <ref>.supabase.co
    const parts = host.split('.')
    if (parts.length >= 3) return parts[0]
  } catch {}
  return null
}

const ref = getProjectRef()
if (!ref) {
  console.error('❌ Nie udało się ustalić project-ref Supabase. Ustaw NEXT_PUBLIC_SUPABASE_URL lub supabase/.temp/project-ref')
  process.exit(1)
}

// 3) Read DB password
const rawPass = process.env.NEXT_PRIVATE_SUPABASE_PASSWD || process.env.SUPABASE_DB_PASSWORD || ''
if (!rawPass) {
  console.error('❌ Brak hasła do bazy. Ustaw NEXT_PRIVATE_SUPABASE_PASSWD w .env.prod')
  process.exit(1)
}

// 4) Build DB URLs
const database = 'postgres'
const encPass = encodeURIComponent(rawPass) // URL-encode password

// Pooler (recommended for many clients)
const pooler = {
  user: `postgres.${ref}`,
  host: 'aws-1-eu-north-1.pooler.supabase.com',
  port: 6543,
}
const poolerUrl = `postgresql://${pooler.user}:${encPass}@${pooler.host}:${pooler.port}/${database}`

// Direct DB host (alternative): db.<ref>.supabase.co:5432 with user 'postgres'
const direct = {
  user: 'postgres',
  host: `db.${ref}.supabase.co`,
  port: 5432,
}
const directUrl = `postgresql://${direct.user}:${encPass}@${direct.host}:${direct.port}/${database}`

function runPush(url, label) {
  console.log(`Target DSN (${label}): ${url.replace(encPass, '***')}`)
  const args = ['supabase', 'db', 'push', '--db-url', url, '--include-all', '--debug']
  console.log(`> npx ${args.join(' ')}`)
  return spawnSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' })
}

// 5) Try pooler first, then direct
let res = runPush(poolerUrl, 'pooler')
if (res.status !== 0) {
  console.warn('⚠️  Push via pooler failed, trying direct host...')
  res = runPush(directUrl, 'direct')
}

if (res.status !== 0) {
  console.error('❌ supabase db push zakończone błędem (pooler i direct)')
  process.exit(res.status || 1)
}

console.log('✅ Migracje zostały wypchnięte do produkcyjnej bazy')
