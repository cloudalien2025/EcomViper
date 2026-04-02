import { runFullShopifyIngest } from "@/app/api/ecomviper/_utils/ingest";
import { query } from "@/app/api/ecomviper/_utils/db";
import {
  type SnapshotBrainId,
  type SnapshotResponse,
  type SnapshotStatus,
  SNAPSHOT_LOCK_TTL_MS,
  metricTemplate,
  withMetricState,
} from "@/lib/snapshots/types";

type SnapshotRow = {
  brain_id: SnapshotBrainId;
  snapshot_json: SnapshotResponse["metrics"] | null;
  snapshot_status: SnapshotStatus;
  snapshot_updated_at: string | null;
  hints_json: string[] | null;
  last_error: string | null;
};

type IntegrationRow = {
  id: string;
  shop_domain: string;
};

type EcomCounts = {
  products: number;
  articles: number;
  pages: number;
  collections: number;
};

function cleanError(message: unknown): string | null {
  if (!message || typeof message !== "string") return null;
  return message.slice(0, 240);
}

export async function getLatestShopifyIntegration(userId: string): Promise<IntegrationRow | null> {
  const rows = await query<IntegrationRow>(
    `
    SELECT id, shop_domain
    FROM integrations
    WHERE user_id = $1 AND provider = 'shopify' AND status = 'connected'
    ORDER BY updated_at DESC
    LIMIT 1
    `,
    [userId]
  );
  return rows[0] ?? null;
}

export async function getSnapshot(userId: string, brainId: SnapshotBrainId): Promise<SnapshotResponse> {
  const rows = await query<SnapshotRow>(
    `
    SELECT brain_id, snapshot_json, snapshot_status, snapshot_updated_at, hints_json, last_error
    FROM brain_snapshots
    WHERE user_id = $1 AND brain_id = $2
    LIMIT 1
    `,
    [userId, brainId]
  );

  const row = rows[0];
  if (!row) {
    return {
      brain_id: brainId,
      status: "needs_connection",
      updated_at: null,
      metrics: metricTemplate(brainId, "loading"),
      hints: [],
      last_error: null,
    };
  }

  return {
    brain_id: brainId,
    status: row.snapshot_status,
    updated_at: row.snapshot_updated_at,
    metrics:
      row.snapshot_json && Array.isArray(row.snapshot_json)
        ? withMetricState(
            row.snapshot_json,
            row.snapshot_status === "updating" ? "stale" : "ready"
          )
        : metricTemplate(brainId, row.snapshot_status === "updating" ? "stale" : "loading"),
    hints: row.hints_json ?? [],
    last_error: row.last_error,
  };
}

async function upsertSnapshot(userId: string, payload: SnapshotResponse): Promise<void> {
  await query(
    `
    INSERT INTO brain_snapshots (
      user_id, brain_id, snapshot_json, snapshot_status, snapshot_updated_at, hints_json, last_error, updated_at
    ) VALUES ($1, $2, $3::jsonb, $4, $5, $6::jsonb, $7, now())
    ON CONFLICT (user_id, brain_id)
    DO UPDATE SET
      snapshot_json = EXCLUDED.snapshot_json,
      snapshot_status = EXCLUDED.snapshot_status,
      snapshot_updated_at = EXCLUDED.snapshot_updated_at,
      hints_json = EXCLUDED.hints_json,
      last_error = EXCLUDED.last_error,
      updated_at = now()
    `,
    [
      userId,
      payload.brain_id,
      JSON.stringify(payload.metrics),
      payload.status,
      payload.updated_at,
      JSON.stringify(payload.hints ?? []),
      payload.last_error ?? null,
    ]
  );
}

async function setSnapshotStatus(
  userId: string,
  brainId: SnapshotBrainId,
  status: SnapshotStatus,
  lastError: string | null
): Promise<void> {
  const existing = await getSnapshot(userId, brainId);
  const metrics = existing.metrics.length > 0 ? existing.metrics : metricTemplate(brainId, "loading");
  await upsertSnapshot(userId, {
    brain_id: brainId,
    status,
    updated_at: existing.updated_at,
    metrics: status === "updating" ? withMetricState(metrics, "stale") : metrics,
    hints: existing.hints ?? [],
    last_error: lastError,
  });
}

async function acquireRefreshLock(userId: string, brainId: SnapshotBrainId): Promise<boolean> {
  const ttlMs = SNAPSHOT_LOCK_TTL_MS;
  const rows = await query<{ user_id: string }>(
    `
    INSERT INTO snapshot_refresh_locks (user_id, brain_id, locked_until, updated_at)
    VALUES ($1, $2, now() + ($3 || ' milliseconds')::interval, now())
    ON CONFLICT (user_id, brain_id)
    DO UPDATE SET
      locked_until = EXCLUDED.locked_until,
      updated_at = now()
    WHERE snapshot_refresh_locks.locked_until < now()
    RETURNING user_id
    `,
    [userId, brainId, String(ttlMs)]
  );

  return rows.length > 0;
}

async function releaseRefreshLock(userId: string, brainId: SnapshotBrainId): Promise<void> {
  await query(
    `DELETE FROM snapshot_refresh_locks WHERE user_id = $1 AND brain_id = $2`,
    [userId, brainId]
  );
}

async function computeEcomViperSnapshot(userId: string, runIngest: boolean): Promise<SnapshotResponse> {
  const integration = await getLatestShopifyIntegration(userId);
  if (!integration) {
    return {
      brain_id: "ecomviper",
      status: "needs_connection",
      updated_at: null,
      metrics: metricTemplate("ecomviper", "loading"),
      hints: ["Connect your Shopify Store to start analysis."],
      last_error: null,
    };
  }

  let runError: string | null = null;
  if (runIngest) {
    const runResult = await runFullShopifyIngest({ userId, integrationId: integration.id });
    if (runResult.status === "failed") {
      runError = cleanError(runResult.errorMessage ?? "EcomViper analysis failed.");
    }
  }

  const countRows = await query<EcomCounts>(
    `
    SELECT
      COUNT(*) FILTER (WHERE node_type = 'product')::int AS products,
      COUNT(*) FILTER (WHERE node_type = 'article')::int AS articles,
      COUNT(*) FILTER (WHERE node_type = 'page')::int AS pages,
      COUNT(*) FILTER (WHERE node_type = 'collection')::int AS collections
    FROM site_nodes
    WHERE user_id = $1 AND integration_id = $2
    `,
    [userId, integration.id]
  );

  const counts = countRows[0] ?? { products: 0, articles: 0, pages: 0, collections: 0 };

  const latestRun = await query<{ status: string; error_message: string | null }>(
    `
    SELECT status, error_message
    FROM ingest_runs
    WHERE user_id = $1 AND integration_id = $2
    ORDER BY started_at DESC
    LIMIT 1
    `,
    [userId, integration.id]
  );

  const latestStatus = latestRun[0]?.status ?? "pending";
  const latestError = cleanError(latestRun[0]?.error_message ?? null);

  const hasAnyData = counts.products + counts.articles + counts.pages + counts.collections > 0;
  const status: SnapshotStatus = runError || latestStatus === "failed"
    ? "error"
    : hasAnyData
      ? "up_to_date"
      : "updating";

  const readiness = hasAnyData ? 78 : 0;
  const differentiated = Math.max(0, counts.products - Math.floor(counts.products * 0.2));
  const trustGap = Math.max(0, 12 - Math.min(12, Math.floor(counts.products / 10)));
  const evidenceGap = Math.max(0, 15 - Math.min(15, Math.floor((counts.articles + counts.pages) / 3)));

  return {
    brain_id: "ecomviper",
    status,
    updated_at: new Date().toISOString(),
    metrics: [
      {
        key: "product_selection_readiness",
        label: "Product Selection Readiness",
        value: readiness,
        unit: "%",
        state: status === "updating" ? "stale" : "ready",
      },
      {
        key: "products_optimized_total",
        label: "Products Optimized / Total",
        value: `${differentiated}/${counts.products}`,
        state: status === "updating" ? "stale" : "ready",
      },
      {
        key: "differentiation_gaps",
        label: "Differentiation Gaps",
        value: Math.max(0, counts.products - differentiated),
        state: status === "updating" ? "stale" : "ready",
      },
      {
        key: "trust_infrastructure_gaps",
        label: "Trust Infrastructure Gaps",
        value: trustGap,
        state: status === "updating" ? "stale" : "ready",
      },
      {
        key: "evidence_social_proof_gaps",
        label: "Evidence/Social Proof Gaps",
        value: evidenceGap,
        state: status === "updating" ? "stale" : "ready",
      },
      {
        key: "compliance_risk_flags_count",
        label: "Compliance/Risk Flags Count (aggregate)",
        value: 0,
        state: status === "updating" ? "stale" : "ready",
      },
    ],
    hints:
      status === "error"
        ? ["Snapshot refresh encountered an issue. Try again or review integration status."]
        : hasAnyData
          ? ["Snapshot refreshed from Shopify-linked product entities."]
          : ["Connected successfully. Data ingest is still in progress."],
    last_error: runError ?? latestError,
  };
}

export type ScheduleSnapshotRefreshInput = {
  userId: string;
  brainId: SnapshotBrainId;
  runIngest?: boolean;
};

export type ScheduleSnapshotRefreshResult = {
  status: "scheduled" | "locked";
};

export async function scheduleSnapshotRefresh(
  input: ScheduleSnapshotRefreshInput
): Promise<ScheduleSnapshotRefreshResult> {
  const { userId, brainId, runIngest = true } = input;

  const locked = await acquireRefreshLock(userId, brainId);
  if (!locked) {
    return { status: "locked" };
  }

  void (async () => {
    try {
      await setSnapshotStatus(userId, brainId, "updating", null);
      const snapshot = await computeEcomViperSnapshot(userId, runIngest);
      await upsertSnapshot(userId, snapshot);
    } catch (error) {
      await setSnapshotStatus(
        userId,
        brainId,
        "error",
        cleanError(error instanceof Error ? error.message : "Unknown snapshot refresh error")
      );
    } finally {
      await releaseRefreshLock(userId, brainId);
    }
  })();

  return { status: "scheduled" };
}
