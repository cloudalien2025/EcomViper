import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { Zap } from "lucide-react";
import SidebarNav from "@/components/ecomviper/SidebarNav";
import LockedBrainView from "@/components/brains/LockedBrainView";
import { isEntitled, resolveUserFromHeaders } from "@/lib/auth/entitlements";
import { brainCatalogById } from "@/lib/brains/brainCatalog";
import { aiSelectionCopy } from "@/lib/copy/aiSelectionCopy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EcomViperLayout({ children }: { children: ReactNode }) {
  let user = null;
  try {
    const headersList = await headers();
    user = resolveUserFromHeaders(headersList);
  } catch {
    user = null;
  }

  if (!isEntitled(user, "ecomviper")) {
    const meta = brainCatalogById.ecomviper;
    return <LockedBrainView title={meta.upsellTitle} message={meta.upsellMessage} ctaLabel="Request Access" />;
  }

  return (
    <div className="ecomviper-hud min-h-screen text-slate-100">
      <div className="ecomviper-vignette pointer-events-none fixed inset-0" />
      <div className="ecomviper-grid pointer-events-none fixed inset-0 opacity-40" />

      <div className="relative mx-auto flex min-h-screen max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside
          data-testid="ecomviper-sidebar"
          className="hidden w-72 shrink-0 rounded-2xl border border-cyan-300/20 bg-slate-950/60 p-5 backdrop-blur-xl shadow-[0_24px_60px_rgba(2,6,23,0.72)] lg:flex lg:flex-col"
        >
          <Link href="/ecomviper" className="mb-6 rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">EcomViper</div>
            <div className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-100">
              <Zap className="h-5 w-5 text-cyan-300" /> {aiSelectionCopy.ecomviper.shellTitle}
            </div>
            <p className="mt-2 text-sm text-slate-400">{aiSelectionCopy.ecomviper.shellSubtitle}</p>
          </Link>

          <SidebarNav />

          <div className="mt-auto rounded-xl border border-cyan-300/15 bg-slate-900/70 p-3 text-xs text-slate-400">
            Status: <span className="text-cyan-200">Neural link active</span>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}
