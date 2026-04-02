import { Lock } from "lucide-react";
import { brainTheme } from "@/components/brain-dock/brainTheme";

type LockedBrainViewProps = {
  title: string;
  message: string;
  ctaLabel?: string;
};

export default function LockedBrainView({ title, message, ctaLabel = "Request Access" }: LockedBrainViewProps) {
  return (
    <div className="ecomviper-hud min-h-screen text-slate-100">
      <div className="ecomviper-vignette pointer-events-none fixed inset-0" />
      <div className="ecomviper-grid pointer-events-none fixed inset-0 opacity-40" />

      <main className="relative mx-auto flex min-h-screen max-w-4xl items-center px-6 py-10">
        <section className={`${brainTheme.glassCard} w-full p-8`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-400/15 px-3 py-1 text-xs uppercase tracking-[0.16em] text-amber-100">
            <Lock className="h-3.5 w-3.5" />
            Locked
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-white">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">{message}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled className={`${brainTheme.glowButton} cursor-not-allowed opacity-70`} aria-disabled="true">
              {ctaLabel}
            </button>
            <p className="self-center text-xs text-slate-400">Access is managed by entitlements. Contact your workspace admin.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
