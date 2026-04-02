"use client";

import Link from "next/link";
import HudCard from "@/components/ecomviper/HudCard";
import NeonButton from "@/components/ecomviper/NeonButton";
import type { SnapshotResponse } from "@/lib/snapshots/types";

type SnapshotCardProps = {
  title: string;
  snapshot: SnapshotResponse;
  ctaLabel: string;
  ctaHref: string;
};

function ValueBlock({ value, loading }: { value: string | number | null; loading: boolean }) {
  if (loading || value == null) {
    return <div className="h-6 w-28 animate-pulse rounded bg-cyan-300/20" />;
  }
  return <div className="text-xl font-semibold text-cyan-100">{String(value)}</div>;
}

export default function SnapshotCard({ title, snapshot, ctaLabel, ctaHref }: SnapshotCardProps) {
  return (
    <HudCard title={title} subtitle="Snapshot loads immediately and fills as analysis updates return.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {snapshot.metrics.map((metric) => (
          <article key={metric.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{metric.label}</div>
            <div className="mt-2">
              <ValueBlock value={metric.value} loading={metric.state === "loading"} />
            </div>
          </article>
        ))}
      </div>

      {snapshot.hints && snapshot.hints.length > 0 ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
          {snapshot.hints.join(" ")}
        </div>
      ) : null}

      {snapshot.last_error ? (
        <div className="mt-4 rounded-xl border border-rose-300/35 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {snapshot.last_error}
        </div>
      ) : null}

      <div className="mt-4">
        <Link href={ctaHref}>
          <NeonButton>{ctaLabel}</NeonButton>
        </Link>
      </div>
    </HudCard>
  );
}
