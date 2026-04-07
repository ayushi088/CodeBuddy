import { Pool } from 'pg'

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return undefined
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

type PgErrorWithCode = Error & { code?: string }

function getNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback

  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function shouldUseDatabaseSSL(): boolean {
  const sslEnv = process.env.DATABASE_SSL?.toLowerCase().trim()
  if (sslEnv) {
    return sslEnv === 'true' || sslEnv === '1' || sslEnv === 'require'
  }

  if (process.env.DATABASE_URL?.includes('sslmode=require')) {
    return true
  }

  return process.env.NODE_ENV === 'production'
}

function isTransientDatabaseError(error: unknown): boolean {
  const err = error as PgErrorWithCode
  const message = (err?.message || '').toLowerCase()

  if (err?.code && ['ECONNRESET', 'ETIMEDOUT', '57P01', '57P02', '57P03'].includes(err.code)) {
    return true
  }

  return (
    message.includes('connection terminated unexpectedly') ||
    message.includes('connection timeout') ||
    message.includes('read econnreset')
  )
}

const useSSL = shouldUseDatabaseSSL()
const maxConnections = getNumberEnv('DATABASE_POOL_MAX', 10)
const idleTimeoutMillis = getNumberEnv('DATABASE_IDLE_TIMEOUT_MS', 30000)
const connectionTimeoutMillis = getNumberEnv('DATABASE_CONNECT_TIMEOUT_MS', 12000)
const queryRetryCount = getNumberEnv('DATABASE_QUERY_RETRY_COUNT', 1)

// Create a connection pool for Render PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  max: maxConnections,
  idleTimeoutMillis,
  connectionTimeoutMillis,
  keepAlive: true,
})

// Test connection on startup
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  let lastError: unknown

  for (let attempt = 0; attempt <= queryRetryCount; attempt += 1) {
    try {
      const start = Date.now()
      const res = await pool.query(text, params)
      return res.rows as T[]
    } catch (error) {
      lastError = error
      const isRetryable = isTransientDatabaseError(error)
      const hasRetriesLeft = attempt < queryRetryCount
      if (!isRetryable || !hasRetriesLeft) {
        throw error
      }
    }
  }

  throw lastError
}

export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] || null
}

export async function transaction<T>(callback: (client: typeof pool) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(pool)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export default pool
