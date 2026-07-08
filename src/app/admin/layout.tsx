"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Shield, LayoutDashboard, Users, Trophy, Tag, LogOut, Recycle, Store } from "lucide-react";

const NAV = [
  { href: "/admin", label: "ภาพรวม", icon: LayoutDashboard, exact: true },
  { href: "/admin/dropgo", label: "Drop & Go", icon: Recycle },
  { href: "/admin/franchises", label: "แฟรนไชส์", icon: Store },
  { href: "/admin/buyers", label: "ผู้ซื้อ", icon: Users },
  { href: "/admin/rewards", label: "รางวัล", icon: Trophy },
  { href: "/admin/prices", label: "อัตราเลทโรงงาน", icon: Tag },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ready, currentUser, logout } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) router.replace("/login");
    else if (currentUser.role !== "admin") router.replace("/home");
  }, [ready, currentUser, router]);

  if (!ready || !currentUser || currentUser.role !== "admin") {
    return <div className="grid min-h-dvh place-items-center text-neutral-400">กำลังโหลด…</div>;
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const doLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-dvh bg-neutral-100">
      <header className="sticky top-0 z-30 bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-ink">
              <Shield className="h-5 w-5" />
            </div>
            <span className="hidden font-bold sm:block">Admin Console</span>
          </div>
          <nav className="ml-3 hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  isActive(n.href, n.exact) ? "bg-white/15 text-gold-light" : "text-white/60 hover:bg-white/10",
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-white/60 sm:block">{currentUser.name}</span>
            <button onClick={doLogout} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-white/70 hover:bg-white/10">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">ออก</span>
            </button>
          </div>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-1.5 md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-sm",
                isActive(n.href, n.exact) ? "bg-white/15 text-gold-light" : "text-white/60",
              )}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
