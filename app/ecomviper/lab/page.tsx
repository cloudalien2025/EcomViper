import HudCard from "@/components/ecomviper/HudCard";
import TopBar from "@/components/ecomviper/TopBar";
import { aiSelectionCopy } from "@/lib/copy/aiSelectionCopy";

export const dynamic = "force-dynamic";

export default function EcomViperLabPage() {
  return (
    <>
      <TopBar breadcrumbs={["Home", "EcomViper", aiSelectionCopy.ecomviper.labTitle]} />
      <HudCard title={aiSelectionCopy.ecomviper.labTitle} subtitle={aiSelectionCopy.ecomviper.labSubtitle}>
        <p className="text-sm text-slate-300">Selection experiments are scaffolded but not enabled in this build.</p>
      </HudCard>
    </>
  );
}
