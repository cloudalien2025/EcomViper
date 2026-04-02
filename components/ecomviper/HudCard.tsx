import type { ReactNode } from "react";

interface HudCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function HudCard({
  children,
  className = "",
  title,
  subtitle,
  actions,
}: HudCardProps) {
  return (
    <section
      className={`rounded-2xl border border-cyan-300/20 bg-slate-950/55 p-5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(148,163,184,0.14),0_24px_50px_rgba(2,6,23,0.7),0_0_36px_rgba(34,211,238,0.08)] ${className}`.trim()}
    >
      {(title || subtitle || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-cyan-400/15 pb-4">
          <div>
            {title ? <h2 className="text-base font-semibold text-slate-100">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}
