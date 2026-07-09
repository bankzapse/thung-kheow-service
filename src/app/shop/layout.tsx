"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PICKUP_ENABLED } from "@/lib/features";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, ReceiptText, Wallet, Tag, LogOut, LayoutGrid, Plus, Box } from "lucide-react";

const NAV = [
  { href: "/shop", label: "ภาพรวม", icon: LayoutDashboard, exact: true, pickup: true },
  { href: "/shop/cabinets", label: "ตู้ Drop Bag", icon: Box, pickup: false },
  { href: "/shop/bills", label: "บิลรับซื้อ", icon: ReceiptText, pickup: true },
  { href: "/shop/accounting", label: "บัญชี", icon: Wallet, pickup: true },
  { href: "/shop/prices", label: "ราคา/วัสดุ", icon: Tag, pickup: true },
].filter((n) => PICKUP_ENABLED || !n.pickup);

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const { ready, currentUser, logout } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) router.replace("/app");
    else if (currentUser.role !== "buyer") router.replace("/home");
    else if (currentUser.status === "suspended") router.replace("/home");
    // Drop-only: หน้าภาพรวม (บิล) ปิดอยู่ → เด้งไปหน้าตู้
    else if (!PICKUP_ENABLED && pathname === "/shop") router.replace("/shop/cabinets");
  }, [ready, currentUser, router, pathname]);

  if (!ready || !currentUser || currentUser.role !== "buyer") {
    return <div className="grid min-h-dvh place-items-center text-neutral-400">กำลังโหลด…</div>;
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  const doLogout = () => { logout(); router.replace("/app"); };

  const NavLink = ({ n, mobile }: { n: (typeof NAV)[number]; mobile?: boolean }) => (
    <Link
      href={n.href}
      className={cn(
        mobile
          ? "flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-sm"
          : "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        isActive(n.href, n.exact)
          ? mobile ? "bg-brand-600 text-white" : "bg-brand-600 text-white shadow-sm"
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
      <header className="sticky top-0 z-40 bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-sm">
        <div className="flex h-14 items-center gap-3 px-4">
          <Logo size={30} className="rounded-lg bg-white p-0.5" />
          <span className="font-bold text-white">ถุงเขียว <span className="font-medium text-white/60">· {PICKUP_ENABLED ? "ร้านรับซื้อ" : "ศูนย์คัดแยก"}</span></span>
          <div className="ml-auto flex items-center gap-1.5">
            {PICKUP_ENABLED && (
              <Link href="/shop/bills/new" className="btn-primary !bg-white !px-3 !py-2 text-sm !text-brand-700 hover:!bg-white/90"><Plus className="h-4 w-4" /> สร้างบิล</Link>
            )}
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
