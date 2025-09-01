#!/usr/bin/env node
const { spawnSync } = require('child_process')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local.active' })

const refFromUrl = () => {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const host = u.hostname
    const parts = host.split('.')
    return parts[0]
  } catch {
    return null
  }
}

const ref = refFromUrl()
const pass = process.env.NEXT_PRIVATE_SUPABASE_PASSWD || process.env.SUPABASE_DB_PASSWORD
if (!ref || !pass) {
  console.error('Missing project ref or DB password (NEXT_PRIVATE_SUPABASE_PASSWD)')
  process.exit(1)
}

const encPass = encodeURIComponent(pass)
const poolerUrl = `postgresql://postgres.${ref}:${encPass}@aws-1-eu-north-1.pooler.supabase.com:6543/postgres`

function run(cmd, args) {
  console.log('> npx', cmd, args.join(' '))
  const res = spawnSync('npx', [cmd, ...args], { stdio: 'inherit', shell: process.platform === 'win32' })
  if (res.status !== 0) process.exit(res.status || 1)
}

// 1) Repair the odd remote version '20250901' to allow pushing our local files
run('supabase', ['migration', 'repair', '--db-url', poolerUrl, '--status', 'reverted', '20250901'])

// 2) Pull current remote schema to sync local state
run('supabase', ['db', 'pull', '--db-url', poolerUrl])

// 3) Push all local migrations (including our merge script)
run('supabase', ['db', 'push', '--db-url', poolerUrl, '--include-all'])

console.log('✅ Repair + push completed')

