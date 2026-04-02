export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/api/ecomviper/_utils/db";
import { ensureUser, resolveUserId } from "@/app/api/ecomviper/_utils/user";

type IntegrationRow = {
  id: string;
  provider: string;
  shop_domain: string;
  scopes: string;
  status: string;
  installed_at: string;
  last_verified_at: string | null;
};

type IngestRunRow = {
  id: string;
  integration_id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  products_count: number;
  articles_count: number;
  pages_count: number;
  collections_count: number;
  error_message: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const userId = resolveUserId(req);
    await ensureUser(userId);

    const integrations = await query<IntegrationRow>(
      `
      SELECT id, provider, shop_domain, scopes, status, installed_at, last_verified_at
      FROM integrations
      WHERE user_id = $1
      ORDER BY updated_at DESC
      `,
      [userId]
    );

    const runs = await query<IngestRunRow>(
      `
      SELECT id, integration_id, status, started_at, finished_at, products_count, articles_count, pages_count, collections_count, error_message
      FROM ingest_runs
      WHERE user_id = $1
      ORDER BY started_at DESC
      LIMIT 100
      `,
      [userId]
    );

    return NextResponse.json({ integrations, runs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown integrations error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
