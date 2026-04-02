"use client";

import type { SnapshotStatus } from "@/lib/snapshots/types";

type SnapshotStatusStripProps = {
  connected: boolean;
  status: SnapshotStatus;
  updatedAt: string | null;
};

function formatLastAnalyzed(updatedAt: string | null): { relative: string; absolute: string } | null {
  if (!updatedAt) return null;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return null;
  const deltaMs = Date.now() - date.getTime();
  const deltaMin = Math.round(deltaMs / 60000);

  let relative = "just now";
  if (deltaMin >= 60 * 24) {
    const days = Math.round(deltaMin / (60 * 24));
    relative = `${days} day${days === 1 ? "" : "s"} ago`;
  } else if (deltaMin >= 60) {
    const hours = Math.round(deltaMin / 60);
    relative = `${hours} hour${hours === 1 ? "" : "s"} ago`;
  } else if (deltaMin > 1) {
    relative = `${deltaMin} minutes ago`;
  }

  return {
    relative,
    absolute: date.toLocaleString(),
  };
}

function statusText(status: SnapshotStatus): string {
  if (status === "up_to_date") return "Up to date";
  if (status === "updating") return "Updating";
  if (status === "error") return "Error";
  return "Needs connection";
}

export default function SnapshotStatusStrip({ connected, status, updatedAt }: SnapshotStatusStripProps) {
  const formatted = formatLastAnalyzed(updatedAt);

  return (
    <section className="rounded-2xl border border-cyan-300/20 bg-slate-950/55 p-4 text-sm text-slate-200">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.1em]">
          Connected: {connected ? "Yes" : "No"}
        </span>
        <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.1em]">
          Snapshot: {statusText(status)}
        </span>
        <span className="text-xs text-slate-300">
          {formatted ? `Last analyzed: ${formatted.relative} (${formatted.absolute})` : "Last analyzed: Not analyzed yet"}
        </span>
      </div>
    </section>
  );
}
