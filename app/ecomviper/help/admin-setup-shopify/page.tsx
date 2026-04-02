import Link from "next/link";
import TopBar from "@/components/ecomviper/TopBar";
import HudCard from "@/components/ecomviper/HudCard";

export default function AdminSetupShopifyHelpPage() {
  return (
    <>
      <TopBar breadcrumbs={["Home", "EcomViper", "Help", "Admin Setup"]} />
      <HudCard title="Admin Setup" subtitle="Environment values required for Shopify OAuth.">
        <ul className="list-disc pl-5 text-sm text-slate-200 space-y-2">
          <li><span className="font-mono">SHOPIFY_CLIENT_ID</span></li>
          <li><span className="font-mono">SHOPIFY_CLIENT_SECRET</span></li>
          <li><span className="font-mono">APP_BASE_URL</span></li>
          <li><span className="font-mono">DATABASE_URL</span></li>
          <li><span className="font-mono">INTEGRATIONS_ENCRYPTION_KEY</span></li>
        </ul>
        <div className="mt-4">
          <Link href="/ecomviper/settings/integrations" className="text-cyan-200 underline">Back to Signal Sources</Link>
        </div>
      </HudCard>
    </>
  );
}
