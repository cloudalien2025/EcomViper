"use client";

import type { ReactNode } from "react";
import HudCard from "@/components/ecomviper/HudCard";
import NeonButton from "@/components/ecomviper/NeonButton";

type ConnectPanelProps = {
  title: string;
  subtitle: string;
  buttonLabel: string;
  onSubmit: () => void;
  submitting: boolean;
  children: ReactNode;
  error?: string | null;
};

export default function ConnectPanel({
  title,
  subtitle,
  buttonLabel,
  onSubmit,
  submitting,
  children,
  error,
}: ConnectPanelProps) {
  return (
    <HudCard title={title} subtitle={subtitle}>
      <div className="space-y-4">
        {children}
        {error ? (
          <div className="rounded-xl border border-rose-300/35 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
        <NeonButton onClick={onSubmit} disabled={submitting}>
          {submitting ? "Connecting..." : buttonLabel}
        </NeonButton>
      </div>
    </HudCard>
  );
}
