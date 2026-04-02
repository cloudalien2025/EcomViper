"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Network, FlaskConical, Cable, CircleHelp } from "lucide-react";

const navItems = [
  { href: "/ecomviper", label: "Agent Readiness", icon: LayoutGrid },
  {
    href: "/ecomviper/products/opa-coq10-200mg/reasoning-hub",
    label: "Selection Hub",
    icon: Network,
  },
  { href: "/ecomviper/lab", label: "Selection Lab", icon: FlaskConical },
  { href: "/ecomviper/settings/integrations", label: "Signal Sources", icon: Cable },
  { href: "/ecomviper/help/connect-shopify", label: "Connect Guide", icon: CircleHelp },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
              active
                ? "border-cyan-300/45 bg-cyan-400/12 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.2)]"
                : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-300/30 hover:text-slate-100"
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {item.label}
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                active ? "bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.7)]" : "bg-slate-600"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
