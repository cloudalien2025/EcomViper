export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/api/ecomviper/_utils/db";
import { runFullShopifyIngest } from "@/app/api/ecomviper/_utils/ingest";
import { scheduleSnapshotRefresh } from "@/app/api/ecomviper/_utils/snapshots";
import { ensureUser, resolveUserId } from "@/app/api/ecomviper/_utils/user";

type IntegrationRow = {
  id: string;
};

type CountRow = {
  products: number;
  articles: number;
  pages: number;
  collections: number;
};

export async function POST(req: NextRequest) {
  try {
    const userId = resolveUserId(req);
    await ensureUser(userId);

    const body = (await req.json().catch(() => ({}))) as { integration_id?: string };
    const integrationId = (body.integration_id ?? "").trim();
    if (!integrationId) {
      return NextResponse.json({ error: "integration_id is required" }, { status: 400 });
    }

    const integration = await query<IntegrationRow>(
      `
      SELECT id
      FROM integrations
      WHERE id = $1 AND user_id = $2 AND provider = 'shopify' AND status = 'connected'
      LIMIT 1
      `,
      [integrationId, userId]
    );

    if (integration.length === 0) {
      return NextResponse.json({ error: "integration not found" }, { status: 404 });
    }

    const runRows = await query<{ id: string }>(
      `
      INSERT INTO ingest_runs (user_id, integration_id, status)
      VALUES ($1, $2, 'running')
      RETURNING id
      `,
      [userId, integrationId]
    );

    const runId = runRows[0].id;
    const ingestResult = await runFullShopifyIngest({ userId, integrationId });

    const counts = await query<CountRow>(
      `
      SELECT
        COUNT(*) FILTER (WHERE node_type = 'product')::int AS products,
        COUNT(*) FILTER (WHERE node_type = 'article')::int AS articles,
        COUNT(*) FILTER (WHERE node_type = 'page')::int AS pages,
        COUNT(*) FILTER (WHERE node_type = 'collection')::int AS collections
      FROM site_nodes
      WHERE user_id = $1 AND integration_id = $2
      `,
      [userId, integrationId]
    );

    const row = counts[0] ?? { products: 0, articles: 0, pages: 0, collections: 0 };
    const status = ingestResult.status === "succeeded" ? "succeeded" : "failed";

    await query(
      `
      UPDATE ingest_runs
      SET
        status = $2,
        finished_at = now(),
        products_count = $3,
        articles_count = $4,
        pages_count = $5,
        collections_count = $6,
        error_message = $7
      WHERE id = $1
      `,
      [
        runId,
        status,
        row.products,
        row.articles,
        row.pages,
        row.collections,
        ingestResult.errorMessage ?? null,
      ]
    );

    await scheduleSnapshotRefresh({ userId, brainId: "ecomviper", runIngest: false });
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingest error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
