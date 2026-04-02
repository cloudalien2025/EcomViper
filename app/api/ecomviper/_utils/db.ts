import { Pool } from "pg";

let pool: Pool | null = null;
let schemaReady = false;
let schemaInitPromise: Promise<void> | null = null;
type PoolClient = {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
  release: () => void;
};

const TRANSIENT_DB_CONNECT_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "57P01",
  "57P02",
  "57P03",
  "53300",
]);

const DB_CONNECT_TIMEOUT_MS = Number.parseInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS ?? "4000", 10);
const DB_MAX_CONNECT_RETRIES = Math.max(1, Math.min(3, Number.parseInt(process.env.DATABASE_CONNECT_MAX_ATTEMPTS ?? "2", 10)));
const DB_RETRY_BACKOFF_MS = Math.max(50, Number.parseInt(process.env.DATABASE_CONNECT_RETRY_BASE_MS ?? "150", 10));

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code.trim().toUpperCase() : "";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "";
}

function isTransientDbConnectError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (TRANSIENT_DB_CONNECT_CODES.has(code)) return true;
  const lower = getErrorMessage(error).toLowerCase();
  return (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("connection terminated unexpectedly") ||
    lower.includes("connection refused") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout")
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withDbConnectRetry<T>(label: string, operation: () => Promise<T>): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt < DB_MAX_CONNECT_RETRIES) {
    attempt += 1;
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDbConnectError(error) || attempt >= DB_MAX_CONNECT_RETRIES) {
        throw error;
      }
      const backoffMs = DB_RETRY_BACKOFF_MS * attempt;
      console.warn(
        `[db] transient connect failure label=${label} code=${getErrorCode(error) || "unknown"} attempt=${attempt}/${DB_MAX_CONNECT_RETRIES}; retrying in ${backoffMs}ms`
      );
      await delay(backoffMs);
    }
  }
  throw lastError;
}

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL not configured");
    }
    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
    });
  }
  return pool;
}

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      const client = getPool();
      await withDbConnectRetry("ensure_schema", () =>
        client.query(`
          CREATE EXTENSION IF NOT EXISTS pgcrypto;

          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            external_id TEXT UNIQUE,
            email TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS integrations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider TEXT NOT NULL,
            shop_domain TEXT NOT NULL,
            access_token_ciphertext TEXT NOT NULL,
            scopes TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'connected',
            installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            last_verified_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (user_id, provider, shop_domain)
          );

          CREATE TABLE IF NOT EXISTS oauth_states (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider TEXT NOT NULL,
            shop_domain TEXT NOT NULL,
            state TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS ingest_runs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
            status TEXT NOT NULL,
            started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            finished_at TIMESTAMPTZ,
            products_count INTEGER NOT NULL DEFAULT 0,
            articles_count INTEGER NOT NULL DEFAULT 0,
            pages_count INTEGER NOT NULL DEFAULT 0,
            collections_count INTEGER NOT NULL DEFAULT 0,
            error_message TEXT
          );

          CREATE TABLE IF NOT EXISTS site_nodes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
            node_type TEXT NOT NULL,
            source_id TEXT NOT NULL,
            handle TEXT,
            title TEXT NOT NULL,
            url TEXT,
            tags JSONB NOT NULL DEFAULT '[]',
            body_text TEXT,
            body_html TEXT,
            image_url TEXT,
            published_at TIMESTAMPTZ,
            updated_at_source TIMESTAMPTZ,
            raw_json JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (integration_id, source_id)
          );

          CREATE INDEX IF NOT EXISTS idx_site_nodes_integration_type
            ON site_nodes(integration_id, node_type);

          CREATE TABLE IF NOT EXISTS product_blog_links (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
            product_node_id UUID NOT NULL REFERENCES site_nodes(id) ON DELETE CASCADE,
            article_node_id UUID NOT NULL REFERENCES site_nodes(id) ON DELETE CASCADE,
            score NUMERIC NOT NULL,
            reason TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (product_node_id, article_node_id)
          );

          CREATE TABLE IF NOT EXISTS byo_api_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider TEXT NOT NULL,
            key_ciphertext TEXT NOT NULL,
            key_last4 TEXT,
            key_length INTEGER,
            label TEXT,
            last_verified_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (user_id, provider)
          );

          CREATE TABLE IF NOT EXISTS brain_snapshots (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            brain_id TEXT NOT NULL,
            snapshot_json JSONB NOT NULL DEFAULT '[]'::jsonb,
            snapshot_status TEXT NOT NULL DEFAULT 'needs_connection',
            snapshot_updated_at TIMESTAMPTZ,
            hints_json JSONB NOT NULL DEFAULT '[]'::jsonb,
            last_error TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (user_id, brain_id)
          );

          CREATE TABLE IF NOT EXISTS snapshot_refresh_locks (
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            brain_id TEXT NOT NULL,
            locked_until TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (user_id, brain_id)
          );
        `)
      );
      schemaReady = true;
    })().catch((error) => {
      schemaInitPromise = null;
      throw error;
    });
  }

  await schemaInitPromise;
}

export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  const client = await withDbConnectRetry("query_connect", () =>
    (getPool() as unknown as { connect: () => Promise<PoolClient> }).connect()
  );

  try {
    const result = await client.query(text, params);
    return (result as { rows: T[] }).rows;
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await withDbConnectRetry("transaction_connect", () =>
    (getPool() as unknown as { connect: () => Promise<PoolClient> }).connect()
  );

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
