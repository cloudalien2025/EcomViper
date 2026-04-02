"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import HudCard from "@/components/ecomviper/HudCard";
import NeonButton from "@/components/ecomviper/NeonButton";
import TopBar from "@/components/ecomviper/TopBar";
import SignalSourcesPanel from "@/components/signal-sources/SignalSourcesPanel";
import { aiSelectionCopy } from "@/lib/copy/aiSelectionCopy";
import { ecomviperSignalSources } from "@/lib/copy/signalSourcesCatalog";

type Integration = {
  id: string;
  provider: string;
  shop_domain: string;
  scopes: string;
  status: string;
  installed_at: string;
  last_verified_at: string | null;
};

type IngestRun = {
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

export default function EcomViperIntegrationsPage() {
  const [callbackParams, setCallbackParams] = useState<{
    connected: boolean;
    shop: string | null;
    error: string | null;
  }>({ connected: false, shop: null, error: null });
  const [shop, setShop] = useState("");
  const [loading, setLoading] = useState(false);
  const [ingestingId, setIngestingId] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [runs, setRuns] = useState<IngestRun[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ecomviper/integrations", { cache: "no-store" });
      const json = (await response.json()) as {
        integrations?: Integration[];
        runs?: IngestRun[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load integrations");
      }
      setIntegrations(json.integrations ?? []);
      setRuns(json.runs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    const params = new URLSearchParams(window.location.search);
    setCallbackParams({
      connected: params.get("connected") === "1",
      shop: params.get("shop"),
      error: params.get("error"),
    });
  }, []);

  const runsByIntegration = useMemo(() => {
    const map = new Map<string, IngestRun>();
    for (const run of runs) {
      if (!map.has(run.integration_id)) {
        map.set(run.integration_id, run);
      }
    }
    return map;
  }, [runs]);

  function normalizeHostname(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/\.$/, "");
  }

  async function onConnect() {
    const normalized = normalizeHostname(shop);
    if (!normalized) {
      setError("Enter your Shopify domain first (for example: yourstore.myshopify.com).");
      return;
    }

    const hostnamePattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
    if (!hostnamePattern.test(normalized)) {
      setError("Please enter a valid hostname like yourstore.myshopify.com.");
      return;
    }

    if (!normalized.endsWith(".myshopify.com")) {
      setError(
        `Please enter ${normalized.split(".")[0] || "yourstore"}.myshopify.com (Shopify's canonical domain).`
      );
      return;
    }

    setError(null);
    const response = await fetch(
      `/api/auth/shopify/start?shop=${encodeURIComponent(normalized)}&dry_run=1`,
      { method: "GET" }
    );

    if (response.status === 500) {
      setError("Shopify connect is temporarily unavailable (server not configured).");
      return;
    }

    let message = "Unable to start Shopify connection.";
    try {
      const json = (await response.json()) as { error?: string; ok?: boolean; redirect_to?: string };
      if (response.ok && json.ok && json.redirect_to) {
        window.location.href = json.redirect_to;
        return;
      }
      if (json.error) message = json.error;
    } catch {
      // no-op
    }
    setError(message);
  }

  async function onIngest(integrationId: string) {
    setIngestingId(integrationId);
    setError(null);
    try {
      const response = await fetch("/api/ingest/shopify/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration_id: integrationId, mode: "full" }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Ingest failed");
      }
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown ingest error");
    } finally {
      setIngestingId(null);
    }
  }

  return (
    <>
      <TopBar
        breadcrumbs={["Home", "EcomViper", "Signal Sources"]}
        searchPlaceholder="Search connector or signal source..."
      />

      <HudCard
        title={aiSelectionCopy.ecomviper.integrationsTitle}
        subtitle={aiSelectionCopy.ecomviper.integrationsSubtitle}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={shop}
            onChange={(event) => setShop(event.target.value)}
            placeholder="yourstore.myshopify.com"
            className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-100 outline-none ring-cyan-300/40 transition focus:border-cyan-300/40 focus:ring-2"
          />
          <NeonButton onClick={onConnect}>Connect Shopify (OAuth)</NeonButton>
        </div>

        <div className="mt-3 text-xs text-slate-400">
          Use the <span className="font-mono">.myshopify.com</span> domain (found in Shopify admin).
        </div>
        <div className="mt-1 text-xs text-slate-400">
          Need help? <Link href="/ecomviper/help/connect-shopify" className="text-cyan-200 underline">Read the connection guide</Link>
          {" "}or{" "}
          <Link href="/ecomviper/help/admin-setup-shopify" className="text-cyan-200 underline">
            admin setup
          </Link>
        </div>

        {callbackParams.connected && callbackParams.shop ? (
          <div className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            Connected to <span className="font-medium">{callbackParams.shop}</span>
          </div>
        ) : null}

        {callbackParams.error ? (
          <div className="mt-4 rounded-xl border border-rose-300/35 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            OAuth callback error: {callbackParams.error}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-300/35 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </HudCard>

      <SignalSourcesPanel
        title="Connector Categories"
        subtitle="Core, recommended, and optional signal sources for the AI Product Selection Index."
        connectors={ecomviperSignalSources}
      />

      <HudCard title="Connected Stores" subtitle="Run full ingest to hydrate the reasoning graph.">
        {loading ? (
          <div className="text-sm text-slate-300">Loading integrations...</div>
        ) : integrations.length === 0 ? (
          <div className="text-sm text-slate-400">No Shopify integration connected yet.</div>
        ) : (
          <div className="space-y-3">
            {integrations.map((integration) => {
              const latestRun = runsByIntegration.get(integration.id);
              return (
                <div
                  key={integration.id}
                  className="rounded-xl border border-cyan-300/20 bg-slate-900/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{integration.shop_domain}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        Scopes: {integration.scopes || "read_products,read_content"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <NeonButton
                        onClick={() => onIngest(integration.id)}
                        disabled={ingestingId === integration.id}
                      >
                        {ingestingId === integration.id ? "Ingesting..." : "Ingest All Pages"}
                      </NeonButton>
                      <Link
                        href="/ecomviper/products/opa-coq10-200mg/reasoning-hub"
                        className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
                      >
                        Open Reasoning Hub
                      </Link>
                    </div>
                  </div>

                  {latestRun ? (
                    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
                      Last run: {latestRun.status.toUpperCase()} | Products {latestRun.products_count} |
                      Articles {latestRun.articles_count} | Pages {latestRun.pages_count} | Collections {" "}
                      {latestRun.collections_count}
                      {latestRun.error_message ? ` | Error: ${latestRun.error_message}` : ""}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-slate-400">No ingest run recorded yet.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </HudCard>
    </>
  );
}
