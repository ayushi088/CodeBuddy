import { Pool } from 'pg'

// Create a connection pool for Render PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection on startup
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  if (process.env.NODE_ENV === 'development') {
    console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount })
  }
  return res.rows as T[]
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
