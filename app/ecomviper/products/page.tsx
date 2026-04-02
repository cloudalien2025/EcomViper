import Link from "next/link";
import TopBar from "@/components/ecomviper/TopBar";
import HudCard from "@/components/ecomviper/HudCard";
import { query } from "@/app/api/ecomviper/_utils/db";
import { resolveUserIdFromHeaders } from "@/app/api/ecomviper/_utils/user";
import { headers } from "next/headers";

type ProductRow = {
  source_id: string;
  handle: string | null;
  title: string;
};

export const dynamic = "force-dynamic";

export default async function EcomViperProductsPage() {
  const headersList = await headers();
  const userId = resolveUserIdFromHeaders(headersList);

  const rows = await query<ProductRow>(
    `
    SELECT source_id, handle, title
    FROM site_nodes
    WHERE user_id = $1 AND node_type = 'product'
    ORDER BY updated_at DESC
    LIMIT 50
    `,
    [userId]
  );

  return (
    <>
      <TopBar breadcrumbs={["Home", "EcomViper", "Products"]} searchPlaceholder="Search products..." />
      <HudCard title="Select a Product" subtitle="Choose a product to continue optimization.">
        {rows.length === 0 ? (
          <div className="text-sm text-slate-300">No products yet. Return to Dashboard to run analysis.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const handle = row.handle || row.source_id;
              return (
                <Link
                  key={row.source_id}
                  href={`/ecomviper/products/${encodeURIComponent(handle)}/reasoning-hub`}
                  className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.06]"
                >
                  <div className="text-sm font-medium text-slate-100">{row.title}</div>
                  <div className="text-xs text-slate-400">{handle}</div>
                </Link>
              );
            })}
          </div>
        )}
        <div className="mt-4">
          <Link href="/ecomviper" className="text-sm text-cyan-200 underline">
            Back to Snapshot
          </Link>
        </div>
      </HudCard>
    </>
  );
}
