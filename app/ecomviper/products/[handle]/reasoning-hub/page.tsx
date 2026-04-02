import TopBar from "@/components/ecomviper/TopBar";
import HudCard from "@/components/ecomviper/HudCard";

export default async function ReasoningHubPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  return (
    <>
      <TopBar breadcrumbs={["Home", "EcomViper", "Products", "Reasoning Hub"]} />
      <HudCard title="Reasoning Hub" subtitle="Selection reasoning view scaffold.">
        <p className="text-sm text-slate-300">Product handle: {decodeURIComponent(handle)}</p>
      </HudCard>
    </>
  );
}
