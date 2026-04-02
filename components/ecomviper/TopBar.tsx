"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, Search, User, X } from "lucide-react";

type TopBarNavItem = {
  href: string;
  label: string;
};

interface TopBarProps {
  breadcrumbs: string[];
  searchPlaceholder?: string;
  userLabel?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  mobileMenuItems?: TopBarNavItem[];
}

export default function TopBar({
  breadcrumbs,
  searchPlaceholder = "Search product reasoning nodes...",
  userLabel = "Ariel Viper",
  searchValue,
  onSearchChange,
  mobileMenuItems,
}: TopBarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header
      data-testid="ecomviper-topbar"
      className="rounded-2xl border border-cyan-300/20 bg-slate-950/55 p-4 backdrop-blur-xl shadow-[0_20px_45px_rgba(2,6,23,0.75)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 lg:items-center">
        <div className="order-1 flex min-w-0 flex-1 flex-wrap items-center gap-1 text-xs uppercase tracking-[0.12em] text-slate-400">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5 text-cyan-300/80" /> : null}
              <span
                className={index === breadcrumbs.length - 1 ? "text-cyan-200" : "text-slate-400"}
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>

        {mobileMenuItems?.length ? (
          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="order-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-100 lg:hidden"
            aria-label="Toggle EcomViper navigation"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        ) : null}

        <div className="order-3 flex min-w-0 w-full items-center gap-2 lg:order-2 lg:w-auto">
          <div className="relative min-w-0 flex-1 lg:w-64 lg:max-w-[60vw]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={onSearchChange ? (event) => onSearchChange(event.target.value) : undefined}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-cyan-300/40 transition focus:border-cyan-300/40 focus:ring-2"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-2 text-xs font-medium tracking-[0.08em] text-cyan-100 uppercase sm:px-3">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{userLabel}</span>
          </div>
        </div>
      </div>

      {mobileMenuOpen && mobileMenuItems?.length ? (
        <nav className="mt-3 grid gap-2 lg:hidden">
          {mobileMenuItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  active
                    ? "border-cyan-300/40 bg-cyan-400/12 text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-slate-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
