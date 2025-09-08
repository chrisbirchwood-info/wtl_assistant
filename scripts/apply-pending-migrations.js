#!/usr/bin/env node
/*
 * Apply any pending SQL migrations in supabase/migrations directly via PG (pooler),
 * and record them in supabase_migrations.schema_migrations.
 */

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const dotenv = require('dotenv')

// Load env: prefer .env.local.active -> .env.prod -> .env.local -> .env
for (const p of ['.env.local.active', '.env.prod', '.env.local', '.env']) {
  if (fs.existsSync(p)) { dotenv.config({ path: p }); break }
}

function getProjectRef() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const u = new URL(url)
    return u.hostname.split('.')[0]
  } catch {
    return null
  }
}

async function main() {
  const ref = getProjectRef()
  const rawPass = process.env.NEXT_PRIVATE_SUPABASE_PASSWD || process.env.SUPABASE_DB_PASSWORD
  if (!ref || !rawPass) {
    console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or NEXT_PRIVATE_SUPABASE_PASSWD')
    process.exit(1)
  }

  const encPass = encodeURIComponent(rawPass)
  const conn = `postgresql://postgres.${ref}:${encPass}@aws-1-eu-north-1.pooler.supabase.com:6543/postgres`

  const client = new Client({
    connectionString: conn,
    application_name: 'wtl_apply_pending_migrations',
    ssl: { rejectUnauthorized: false },
    // Use simple query protocol to improve compatibility through pooler/pgbouncer
    simple_query: true,
  })
  await client.connect()

  try {
    // Ensure migrations table exists
    await client.query('CREATE SCHEMA IF NOT EXISTS supabase_migrations;')
    await client.query('CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text PRIMARY KEY, statements text[], name text);')

    const res = await client.query('SELECT version FROM supabase_migrations.schema_migrations ORDER BY version')
    const applied = new Set(res.rows.map(r => r.version))

    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.toLowerCase().endsWith('.sql'))
      .sort()

    const toApply = []
    for (const file of files) {
      const version = file.split('_')[0]
      if (!applied.has(version)) toApply.push({ file, version })
    }

    if (toApply.length === 0) {
      console.log('No pending migrations. Database is up to date.')
      return
    }

    console.log('Pending migrations:')
    toApply.forEach(m => console.log(' - ' + m.file))

    for (const { file, version } of toApply) {
      const abs = path.join(migrationsDir, file)
      const sql = fs.readFileSync(abs, 'utf8')
      console.log(`\nApplying ${file} ...`)

      await client.query('BEGIN')
      try {
        // Normalize DO $$ blocks for pooler/compat: ensure LANGUAGE plpgsql is present at end of DO blocks
        let text = sql
        if (/\bDO\s*\$\$/i.test(text)) {
          // Strip DO $$ ... END $$; blocks (pgbouncer/pooler incompat), and inject function directly
          const createUpdatedAtFn = `CREATE OR REPLACE FUNCTION public.update_updated_at_column()\nRETURNS TRIGGER AS $$\nBEGIN\n  NEW.updated_at = NOW();\n  RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;\n`;
          text = text.replace(/DO\s*\$\$[\s\S]*?END\s*\$\$\s*;?/gi, '')
          text = createUpdatedAtFn + "\n" + text
        }
        // Execute the whole file within a transaction; postgres allows multi-statements
        await client.query(text)
        // Record migration as applied
        await client.query(
          'INSERT INTO supabase_migrations.schema_migrations(version,name) VALUES ($1,$2) ON CONFLICT (version) DO NOTHING',
          [version, file]
        )
        await client.query('COMMIT')
        console.log(`✓ Applied ${file}`)
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {})
        console.error(`✗ Failed ${file}: ${e.message}`)
        process.exit(1)
      }
    }

    console.log('\nAll pending migrations applied successfully.')
  } finally {
    await client.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
