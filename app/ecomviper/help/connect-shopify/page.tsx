import Link from "next/link";
import TopBar from "@/components/ecomviper/TopBar";
import HudCard from "@/components/ecomviper/HudCard";

export default function ConnectShopifyHelpPage() {
  return (
    <>
      <TopBar breadcrumbs={["Home", "EcomViper", "Help", "Connect Shopify"]} />
      <HudCard title="Connect Shopify" subtitle="Quick setup steps for Shopify OAuth connection.">
        <ol className="list-decimal pl-5 text-sm text-slate-200 space-y-2">
          <li>Open Shopify admin and confirm your store domain ends with <span className="font-mono">.myshopify.com</span>.</li>
          <li>Paste that domain in Signal Sources.</li>
          <li>Approve OAuth and return to EcomViper.</li>
        </ol>
        <div className="mt-4">
          <Link href="/ecomviper/settings/integrations" className="text-cyan-200 underline">Back to Signal Sources</Link>
        </div>
      </HudCard>
    </>
  );
}
