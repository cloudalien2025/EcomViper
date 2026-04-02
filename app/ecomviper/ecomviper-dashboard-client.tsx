"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/ecomviper/TopBar";
import ConnectPanel from "@/components/connect/ConnectPanel";
import SnapshotCard from "@/components/snapshots/SnapshotCard";
import SnapshotStatusStrip from "@/components/snapshots/SnapshotStatusStrip";
import HudCard from "@/components/ecomviper/HudCard";
import {
  type SnapshotResponse,
  isSnapshotStale,
  metricTemplate,
  type SnapshotStatus,
} from "@/lib/snapshots/types";

const EMPTY_SNAPSHOT: SnapshotResponse = {
  brain_id: "ecomviper",
  status: "needs_connection",
  updated_at: null,
  metrics: metricTemplate("ecomviper", "loading"),
  hints: [],
  last_error: null,
};

export default function EcomViperDashboardClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [shopDomain, setShopDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotResponse>(EMPTY_SNAPSHOT);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connected = snapshot.status !== "needs_connection";

  function clearPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  async function loadSnapshot(): Promise<SnapshotResponse | null> {
    try {
      const response = await fetch("/api/ecomviper/snapshot", { cache: "no-store" });
      const json = (await response.json()) as SnapshotResponse & { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Failed to load snapshot");
      setSnapshot(json);
      return json;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown snapshot error");
      return null;
    }
  }

  function startPolling() {
    clearPolling();
    const startedAt = Date.now();
    pollTimerRef.current = setInterval(async () => {
      const next = await loadSnapshot();
      if (!next) return;

      const done = next.status === "up_to_date" || next.status === "error";
      const timedOut = Date.now() - startedAt > 20_000;
      if (done || timedOut) {
        clearPolling();
        setAnalyzing(false);
      }
    }, 1500);
  }

  async function refreshSnapshot() {
    await fetch("/api/ecomviper/snapshot/refresh", { method: "POST" });
    setSnapshot((prev) => ({
      ...prev,
      status: "updating",
      metrics: prev.metrics.map((metric) => ({
        ...metric,
        state: metric.value == null ? "loading" : "stale",
      })),
    }));
  }

  function normalizeHostname(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/\.$/, "");
  }

  async function handleConnect() {
    setSubmitting(true);
    setError(null);

    try {
      const normalized = normalizeHostname(shopDomain);
      if (!normalized) throw new Error("Enter your Shopify domain first.");

      const response = await fetch(
        `/api/auth/shopify/start?shop=${encodeURIComponent(normalized)}&dry_run=1`,
        { method: "GET" }
      );
      const json = (await response.json()) as { redirect_to?: string; error?: string };
      if (!response.ok || !json.redirect_to) {
        throw new Error(json.error ?? "Unable to start Shopify connection.");
      }

      window.location.href = json.redirect_to;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown connect error");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    void (async () => {
      const first = await loadSnapshot();
      if (!first) return;

      const justConnected = searchParams.get("connected") === "1";
      if (justConnected) {
        setAnalyzing(true);
        await refreshSnapshot();
        startPolling();

        const params = new URLSearchParams(searchParams.toString());
        params.delete("connected");
        params.delete("shop");
        params.delete("error");
        const nextQuery = params.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
        return;
      }

      if (first.status === "needs_connection") return;
      if (first.status === "updating" || isSnapshotStale(first.updated_at)) {
        await refreshSnapshot();
        startPolling();
      }
    })();

    return () => clearPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusForStrip = useMemo<SnapshotStatus>(() => {
    if (analyzing && snapshot.status !== "needs_connection") return "updating";
    return snapshot.status;
  }, [analyzing, snapshot.status]);

  return (
    <>
      <TopBar
        breadcrumbs={["Home", "EcomViper", "AI Product Selection Engine"]}
        searchPlaceholder="Search product entity, signal, or selection blueprint..."
      />

      <SnapshotStatusStrip connected={connected} status={statusForStrip} updatedAt={snapshot.updated_at} />

      {!connected ? (
        <ConnectPanel
          title="Connect your Shopify Store"
          subtitle="Add your store domain to start your snapshot automatically."
          buttonLabel="Connect your Shopify Store"
          onSubmit={handleConnect}
          submitting={submitting}
          error={error}
        >
          <input
            value={shopDomain}
            onChange={(event) => setShopDomain(event.target.value)}
            placeholder="yourstore.myshopify.com"
            className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-100 outline-none ring-cyan-300/40 transition focus:border-cyan-300/40 focus:ring-2"
          />
        </ConnectPanel>
      ) : null}

      {analyzing ? (
        <HudCard title="Analyzing..." subtitle="Your snapshot shell is ready. Metrics will fill in as results arrive.">
          <div className="h-1" />
        </HudCard>
      ) : null}

      {connected ? (
        <SnapshotCard
          title="AI Product Agent Discovery Snapshot"
          snapshot={snapshot}
          ctaLabel="Select a Product to Optimize"
          ctaHref="/ecomviper/products"
        />
      ) : null}
    </>
  );
}
