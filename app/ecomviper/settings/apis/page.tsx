"use client";

import { useEffect, useState } from "react";
import HudCard from "@/components/ecomviper/HudCard";
import NeonButton from "@/components/ecomviper/NeonButton";
import TopBar from "@/components/ecomviper/TopBar";
import SignalSourcesPanel from "@/components/signal-sources/SignalSourcesPanel";
import { aiSelectionCopy } from "@/lib/copy/aiSelectionCopy";
import { ecomviperSignalSources } from "@/lib/copy/signalSourcesCatalog";

type ProviderState = {
  provider: "openai" | "ga4" | "serpapi";
  label: string | null;
  connected: boolean;
  masked_key: string;
  updated_at: string | null;
};

const PROVIDERS: ProviderState["provider"][] = ["openai", "ga4", "serpapi"];

export default function EcomViperApisPage() {
  const [providers, setProviders] = useState<Record<string, ProviderState>>({});
  const [values, setValues] = useState<Record<string, string>>({ openai: "", ga4: "", serpapi: "" });
  const [labels, setLabels] = useState<Record<string, string>>({ openai: "", ga4: "", serpapi: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const response = await fetch("/api/ecomviper/byo-keys", { cache: "no-store" });
      const json = (await response.json()) as { providers?: ProviderState[]; error?: string };
      if (!response.ok) throw new Error(json.error ?? "Failed to load API keys");

      const next: Record<string, ProviderState> = {};
      for (const provider of json.providers ?? []) {
        next[provider.provider] = provider;
      }
      setProviders(next);
      setLabels((prev) => {
        const updated = { ...prev };
        for (const provider of PROVIDERS) {
          if (next[provider]?.label) updated[provider] = next[provider].label ?? "";
        }
        return updated;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown load error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(provider: ProviderState["provider"]) {
    const apiKey = values[provider]?.trim() ?? "";
    if (!apiKey) {
      setError(`Enter a key for ${provider.toUpperCase()}`);
      return;
    }

    setSaving(provider);
    setNotice(null);
    setError(null);

    try {
      const response = await fetch("/api/ecomviper/byo-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, api_key: apiKey, label: labels[provider] || null }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Failed to save key");

      setValues((prev) => ({ ...prev, [provider]: "" }));
      await load();
      setNotice(`${provider.toUpperCase()} credential saved.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown save error");
    } finally {
      setSaving(null);
    }
  }

  async function remove(provider: ProviderState["provider"]) {
    setSaving(provider);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(`/api/ecomviper/byo-keys?provider=${provider}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Failed to delete key");
      await load();
      setNotice(`${provider.toUpperCase()} credential removed.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown delete error");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <TopBar breadcrumbs={["Home", "EcomViper", "Signal Sources", "Credentials"]} />
      <HudCard
        title={aiSelectionCopy.ecomviper.byoTitle}
        subtitle={aiSelectionCopy.ecomviper.byoSubtitle}
      >
        {notice ? (
          <div className="mb-4 rounded-xl border border-emerald-300/35 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-300/35 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          {PROVIDERS.map((provider) => {
            const status = providers[provider];
            const connected = Boolean(status?.connected);

            return (
              <div key={provider} className="rounded-xl border border-cyan-300/20 bg-slate-900/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">
                      {provider}
                    </div>
                    <div className="text-xs text-slate-400">
                      {connected
                        ? `Connected (${status?.masked_key})${status?.updated_at ? ` · Saved ${new Date(status.updated_at).toLocaleString()}` : ""}`
                        : "Disconnected"}
                    </div>
                    {status?.label ? (
                      <div className="text-xs text-slate-500">Label: {status.label}</div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <input
                    value={values[provider] ?? ""}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, [provider]: event.target.value }))
                    }
                    placeholder={`Paste ${provider.toUpperCase()} key`}
                    className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300/40 focus:border-cyan-300/40 focus:ring-2"
                  />
                  <input
                    value={labels[provider] ?? ""}
                    onChange={(event) =>
                      setLabels((prev) => ({ ...prev, [provider]: event.target.value }))
                    }
                    placeholder="Optional label"
                    className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300/40 focus:border-cyan-300/40 focus:ring-2"
                  />
                  <NeonButton onClick={() => save(provider)} disabled={saving === provider}>
                    {saving === provider ? "Saving..." : "Save"}
                  </NeonButton>
                  <NeonButton
                    variant="secondary"
                    onClick={() => remove(provider)}
                    disabled={saving === provider || !connected}
                  >
                    Delete
                  </NeonButton>
                </div>
              </div>
            );
          })}
        </div>
      </HudCard>

      <SignalSourcesPanel
        title="EcomViper Signal Sources"
        subtitle="Connector framing for the AI Product Selection Engine. Shopify OAuth remains a coming-next scaffold in this task."
        connectors={ecomviperSignalSources}
      />
    </>
  );
}
