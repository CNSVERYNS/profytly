"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Watchlist",
    isActive: (pathname: string) =>
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/vehicle/"),
  },
  {
    href: "/inventory",
    label: "Inventory",
    isActive: (pathname: string) => pathname.startsWith("/inventory"),
  },
  {
    href: "/sold",
    label: "Sold Vehicles",
    isActive: (pathname: string) => pathname.startsWith("/sold"),
  },
  {
    href: "/reports",
    label: "Reports",
    isActive: (pathname: string) => pathname.startsWith("/reports"),
  },
  {
    href: "/settings",
    label: "Settings",
    isActive: (pathname: string) => pathname.startsWith("/settings"),
  },
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/dashboard" className="text-2xl font-bold">
          Profyt<span className="text-green-500">ly</span>
        </Link>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-green-500 text-black"
                    : "border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <button
            onClick={logout}
            className="whitespace-nowrap rounded-lg border border-red-900 px-4 py-2 text-sm font-medium text-red-400 transition hover:border-red-700 hover:bg-red-950"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}