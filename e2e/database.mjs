import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(here, '../../API')
const require = createRequire(path.join(apiRoot, 'package.json'))
const dotenv = require('dotenv')
const { Pool } = require('pg')

export const E2E_DATABASE = 'mygroomer_e2e'
const localHosts = ['localhost', '127.0.0.1', '[::1]']

export function applyE2eDatabaseUrl() {
  dotenv.config({ path: path.join(apiRoot, '.env'), quiet: true })
  if (process.env.LOCAL_TEST_MODE !== 'true') {
    throw new Error('LOCAL_TEST_MODE ausente. O banco de ponta a ponta só existe no ambiente local.')
  }
  const current = process.env.DATABASE_URL
  if (!current) throw new Error('DATABASE_URL ausente')
  const url = new URL(current)
  if (!localHosts.includes(url.hostname)) {
    throw new Error('O banco de ponta a ponta recusou um host que não é local')
  }
  const name = url.pathname.replace(/^\//, '')
  if (name !== 'mygroomer_dev' && name !== E2E_DATABASE) {
    throw new Error('O banco de ponta a ponta só pode ser derivado do Postgres local de desenvolvimento')
  }
  url.pathname = `/${E2E_DATABASE}`
  process.env.DATABASE_URL = url.toString()
  return process.env.DATABASE_URL
}

async function ensureDatabase(e2eUrl) {
  const admin = new URL(e2eUrl)
  admin.pathname = '/mygroomer_dev'
  const pool = new Pool({ connectionString: admin.toString() })
  try {
    const exists = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [E2E_DATABASE])
    if (exists.rowCount === 0) await pool.query(`CREATE DATABASE ${E2E_DATABASE}`)
  } finally {
    await pool.end()
  }
}

function migrationFiles() {
  return readdirSync(path.join(apiRoot, 'migrations')).filter(name => /^\d+.*\.sql$/.test(name)).sort()
}

async function migrationsCurrent(e2eUrl) {
  const pool = new Pool({ connectionString: e2eUrl })
  try {
    const registry = await pool.query("SELECT to_regclass('public.schema_migrations') AS name")
    if (!registry.rows[0]?.name) return false
    const applied = await pool.query('SELECT name FROM public.schema_migrations')
    const have = new Set(applied.rows.map(row => row.name))
    return migrationFiles().every(name => have.has(name))
  } catch {
    return false
  } finally {
    await pool.end()
  }
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: apiRoot,
    env: process.env,
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    throw new Error(`${path.basename(args[0])} saiu com código ${result.status ?? 'desconhecido'}`)
  }
}

async function migrateIfNeeded(e2eUrl) {
  if (await migrationsCurrent(e2eUrl)) return
  runNode([path.join(apiRoot, 'node_modules/ts-node/dist/bin.js'), 'src/scripts/migrate.ts'])
}

function resetDatabase() {
  runNode([path.join(apiRoot, 'dist/scripts/reset-e2e.js')])
}

export async function assertApiUsesE2eDatabase() {
  let response
  try {
    response = await fetch(`${process.env.E2E_API_URL || 'http://127.0.0.1:3000'}/api/v1/runtime`)
  } catch {
    throw new Error('API local indisponível em :3000. Suba a API com DATABASE_URL apontando para mygroomer_e2e.')
  }
  if (!response.ok) throw new Error(`API local indisponível (${response.status})`)
  const body = await response.json()
  const databaseName = body?.data?.databaseName
  if (databaseName !== E2E_DATABASE) {
    throw new Error(`A API em :3000 está no banco ${databaseName || 'desconhecido'}. Os testes de ponta a ponta exigem mygroomer_e2e.`)
  }
}

export async function prepareE2eDatabase() {
  const e2eUrl = applyE2eDatabaseUrl()
  await ensureDatabase(e2eUrl)
  await migrateIfNeeded(e2eUrl)
  resetDatabase()
  await assertApiUsesE2eDatabase()
}

const entry = process.argv[1]?.replace(/\\/g, '/')
if (entry?.endsWith('database.mjs')) {
  const e2eUrl = applyE2eDatabaseUrl()
  await ensureDatabase(e2eUrl)
  await migrateIfNeeded(e2eUrl)
  resetDatabase()
  console.log('mygroomer_e2e ready')
}
