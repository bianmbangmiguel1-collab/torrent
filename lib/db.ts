import { getCloudflareContext } from '@opennextjs/cloudflare'
import { randomBytes } from 'crypto'

type D1SqlValue = string | number | null | ArrayBuffer | Uint8Array | boolean

type D1ExecResultType = Awaited<ReturnType<D1Database['exec']>>

export interface DBRunResult {
  lastID: number
  changes: number
}

export interface DBAdapter {
  get<T = any>(sql: string, params?: unknown[]): Promise<T | undefined>
  all<T = any>(sql: string, params?: unknown[]): Promise<T[]>
  run(sql: string, params?: unknown[]): Promise<DBRunResult>
  exec(sql: string): Promise<D1ExecResultType>
}

function prepareStatement(
  db: D1Database,
  sql: string,
  params: unknown[]
): D1PreparedStatement {
  const statement = db.prepare(sql)
  return params.length > 0 ? statement.bind(...params) : statement
}

export async function getDB(): Promise<DBAdapter> {
  const { env } = await getCloudflareContext({ async: true })
  const d1 = env.DB

  return {
    async get<T = any>(sql: string, params: unknown[] = []): Promise<T | undefined> {
      const result = await prepareStatement(d1, sql, params).first<T>()
      return result ?? undefined
    },

    async all<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
      const result = await prepareStatement(d1, sql, params).all<T>()
      return result.results
    },

    async run(sql: string, params: unknown[] = []): Promise<DBRunResult> {
      const result = await prepareStatement(d1, sql, params).run()

      return {
        lastID: result.meta.last_row_id,
        changes: result.meta.changes
      }
    },

    async exec(sql: string): Promise<D1ExecResultType> {
      return d1.exec(sql)
    }
  }
}

export function generateDownloadToken(): string {
  return randomBytes(32).toString('hex')
}

export function getTokenExpiry(days: number = 30): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

export async function recordProductView(
  userId: number,
  productId: number
): Promise<void> {
  const db = await getDB()

  await db.run(
    `INSERT INTO user_product_views (user_id, product_id, viewed_at) VALUES (?, ?, datetime('now'))`,
    [userId, productId]
  )
}

