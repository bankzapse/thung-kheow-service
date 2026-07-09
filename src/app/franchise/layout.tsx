"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { franchiseById } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { LogOut, LayoutDashboard, Box, PackageOpen, FileText, Landmark, Banknote, LayoutGrid } from "lucide-react";
import { Logo } from "@/components/Logo";
import Link from "next/link";

const NAV = [
  { href: "/franchise", label: "แดชบอร์ด", icon: LayoutDashboard, exact: true },
  { href: "/franchise/cabinets", label: "รหัสตู้", icon: Box },
  { href: "/franchise/bags", label: "ถุงทั้งหมด", icon: PackageOpen },
  { href: "/franchise/reports", label: "รายงาน", icon: FileText },
  { href: "/franchise/income", label: "เงินเข้า", icon: Banknote },
  { href: "/franchise/payout", label: "บัญชีรับเงิน", icon: Landmark },
];

export default function FranchiseLayout({ children }: { children: React.ReactNode }) {
  const { ready, currentUser, logout, db } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) router.replace("/");
    else if (currentUser.role !== "franchise") router.replace("/home");
  }, [ready, currentUser, router]);

  if (!ready || !currentUser || currentUser.role !== "franchise") {
    return <div className="grid min-h-dvh place-items-center text-neutral-400">กำลังโหลด…</div>;
  }

  const fr = franchiseById(db, currentUser.franchiseId ?? "");
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  return (
    <div className="min-h-dvh bg-neutral-100">
      <header className="sticky top-0 z-30 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/franchise" className="flex items-center gap-2">
            <Logo size={30} className="rounded-lg bg-white p-0.5" />
            <span className="font-bold text-white">
              ถุงเขียว{" "}
              <span className="font-medium text-white/60">· {fr ? <>แฟรนไชส์ <span className="font-mono">{fr.code}</span></> : "แฟรนไชส์"}</span>
            </span>
          </Link>
          <nav className="ml-3 hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition", isActive(n.href, n.exact) ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10")}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" className="btn-ghost !px-2 !py-2 text-sm !text-white/85 hover:!bg-white/10"><LayoutGrid className="h-4 w-4" /> <span className="hidden sm:inline">สลับระบบ</span></Link>
            <button onClick={logout} className="btn-ghost !px-2 !py-2 text-sm !text-white/85 hover:!bg-white/10"><LogOut className="h-4 w-4" /> ออก</button>
          </div>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-1.5 md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn("flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-sm", isActive(n.href, n.exact) ? "bg-white/20 text-white" : "text-white/70")}
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
