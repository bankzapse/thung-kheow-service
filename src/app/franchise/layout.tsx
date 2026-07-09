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
    if (!currentUser) router.replace("/app");
    else if (currentUser.role !== "franchise") router.replace("/home");
  }, [ready, currentUser, router]);

  if (!ready || !currentUser || currentUser.role !== "franchise") {
    return <div className="grid min-h-dvh place-items-center text-neutral-400">กำลังโหลด…</div>;
  }

  const fr = franchiseById(db, currentUser.franchiseId ?? "");
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  const doLogout = () => { logout(); router.replace("/app"); };

  const NavLink = ({ n, mobile }: { n: (typeof NAV)[number]; mobile?: boolean }) => (
    <Link
      href={n.href}
      className={cn(
        mobile
          ? "flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-sm"
          : "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        isActive(n.href, n.exact)
          ? mobile ? "bg-emerald-600 text-white" : "bg-emerald-600 text-white shadow-sm"
          : mobile ? "bg-neutral-100 text-neutral-500" : "text-neutral-600 hover:bg-neutral-100",
      )}
    >
      <n.icon className="h-[18px] w-[18px]" />
      {n.label}
    </Link>
  );

  return (
    <div className="min-h-dvh bg-neutral-100">
      {/* Green branding header (full width) */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm">
        <div className="flex h-14 items-center gap-3 px-4">
          <Logo size={30} className="rounded-lg bg-white p-0.5" />
          <span className="font-bold text-white">ถุงเขียว <span className="font-medium text-white/60">· {fr ? <>แฟรนไชส์ <span className="font-mono">{fr.code}</span></> : "แฟรนไชส์"}</span></span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="hidden text-sm text-white/70 lg:block">{currentUser.name}</span>
            <Link href="/app" className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-white/85 hover:bg-white/10"><LayoutGrid className="h-4 w-4" /> <span className="hidden sm:inline">สลับระบบ</span></Link>
            <button onClick={doLogout} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-white/85 hover:bg-white/10"><LogOut className="h-4 w-4" /> <span className="hidden sm:inline">ออก</span></button>
          </div>
        </div>
        {/* Mobile horizontal nav */}
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-white/10 bg-white px-3 py-2 md:hidden">
          {NAV.map((n) => <NavLink key={n.href} n={n} mobile />)}
        </nav>
      </header>

      <div className="flex">
        {/* Desktop left sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-neutral-200 bg-white px-3 py-4 md:flex">
          {NAV.map((n) => <NavLink key={n.href} n={n} />)}
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
