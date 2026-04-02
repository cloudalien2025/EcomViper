import Link from "next/link";
import { Cable, CheckCircle2, CircleDot, Lock } from "lucide-react";
import type { SignalSource } from "@/lib/copy/signalSourcesCatalog";

type SignalSourcesPanelProps = {
  title: string;
  subtitle: string;
  connectors: SignalSource[];
};

const categoryOrder = ["Core", "Recommended", "Optional"] as const;

function statusPill(status: SignalSource["status"]): { label: string; className: string; Icon: typeof CheckCircle2 } {
  if (status === "connected") {
    return {
      label: "Connected",
      className: "border-emerald-300/35 bg-emerald-400/10 text-emerald-100",
      Icon: CheckCircle2,
    };
  }

  if (status === "locked") {
    return {
      label: "Locked",
      className: "border-amber-300/35 bg-amber-400/15 text-amber-100",
      Icon: Lock,
    };
  }

  return {
    label: "Disconnected",
    className: "border-white/20 bg-white/5 text-slate-200",
    Icon: CircleDot,
  };
}

export default function SignalSourcesPanel({ title, subtitle, connectors }: SignalSourcesPanelProps) {
  return (
    <section className="rounded-2xl border border-cyan-300/20 bg-slate-950/55 p-6 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(148,163,184,0.14),0_24px_50px_rgba(2,6,23,0.7),0_0_36px_rgba(34,211,238,0.08)]">
      <header className="mb-4 border-b border-cyan-300/15 pb-4">
        <div className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">Signal Sources</div>
        <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
      </header>

      <div className="space-y-5">
        {categoryOrder.map((category) => {
          const items = connectors.filter((connector) => connector.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category}>
              <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">{category}</div>
              <div className="space-y-2">
                {items.map((connector) => {
                  const pill = statusPill(connector.status);
                  const Icon = pill.Icon;

                  return (
                    <article
                      key={connector.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
                            <Cable className="h-4 w-4 text-cyan-200" />
                            {connector.name}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${pill.className}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {pill.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-300">{connector.description}</p>
                        {connector.disabledReason ? (
                          <p className="mt-1 text-xs text-slate-400">{connector.disabledReason}</p>
                        ) : null}
                      </div>

                      {connector.actionHref ? (
                        <Link
                          href={connector.actionHref}
                          className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
                        >
                          {connector.actionLabel}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title={connector.disabledReason ?? connector.actionLabel}
                          className="inline-flex cursor-not-allowed items-center rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400"
                        >
                          {connector.actionLabel}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
