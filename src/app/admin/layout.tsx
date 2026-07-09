"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PICKUP_ENABLED } from "@/lib/features";
import { canAccessAdminMenu } from "@/lib/permissions";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Users, Trophy, Tag, LogOut, Recycle, Store, Landmark, Banknote, Truck, Receipt, LayoutGrid, PackageSearch, ShieldCheck } from "lucide-react";

const NAV = [
  { href: "/admin", label: "ภาพรวม", icon: LayoutDashboard, exact: true, pickup: true, menu: null as string | null },
  { href: "/admin/dropgo", label: "Drop Bag", icon: Recycle, pickup: false, menu: "dropgo" },
  { href: "/admin/franchises", label: "แฟรนไชส์", icon: Store, pickup: false, menu: "franchises" },
  { href: "/admin/centers", label: "ศูนย์คัดแยก", icon: PackageSearch, pickup: false, menu: "centers" },
  { href: "/admin/collect", label: "เก็บของ", icon: Truck, pickup: false, menu: "collect" },
  { href: "/admin/payouts", label: "อนุมัติบัญชี", icon: Landmark, pickup: false, menu: "payouts" },
  { href: "/admin/payments", label: "โอนเงิน", icon: Banknote, pickup: false, menu: "payments" },
  { href: "/admin/transfers", label: "ประวัติโอน", icon: Receipt, pickup: false, menu: "transfers" },
  { href: "/admin/buyers", label: "ผู้ซื้อ", icon: Users, pickup: true, menu: null },
  { href: "/admin/rewards", label: "รางวัล", icon: Trophy, pickup: true, menu: null },
  { href: "/admin/prices", label: "อัตราเลทโรงงาน", icon: Tag, pickup: true, menu: null },
].filter((n) => PICKUP_ENABLED || !n.pickup);

const OWNER_LINK = { href: "/admin/team", label: "จัดการผู้ดูแล", icon: ShieldCheck, exact: false, pickup: false, menu: null } as (typeof NAV)[number];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ready, currentUser, logout } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) { router.replace("/app"); return; }
    if (currentUser.role !== "admin") { router.replace("/home"); return; }
    if (currentUser.owner) {
      if (!PICKUP_ENABLED && pathname === "/admin") router.replace("/admin/dropgo");
      return;
    }
    // ผู้ดูแล (ไม่ใช่ owner): กันการเข้าเมนูที่ไม่มีสิทธิ์ผ่าน URL ตรง
    if (pathname === "/admin/team") { router.replace("/app"); return; }
    const menuOf = NAV.find((n) => n.menu && (pathname === n.href || pathname.startsWith(n.href + "/")))?.menu;
    if (pathname === "/admin" || (menuOf && !canAccessAdminMenu(currentUser, menuOf))) {
      const first = NAV.find((n) => n.menu && canAccessAdminMenu(currentUser, n.menu));
      router.replace(first ? first.href : "/app");
    }
  }, [ready, currentUser, router, pathname]);

  if (!ready || !currentUser || currentUser.role !== "admin") {
    return <div className="grid min-h-dvh place-items-center text-neutral-400">กำลังโหลด…</div>;
  }

  // เมนูที่ผู้ใช้ปัจจุบันเข้าถึงได้ (owner = ทุกเมนู, ผู้ดูแล = ตามสิทธิ์)
  const nav = NAV.filter((n) => n.menu == null || canAccessAdminMenu(currentUser, n.menu));
  const items = currentUser.owner ? [...nav, OWNER_LINK] : nav;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const doLogout = () => {
    logout();
    router.replace("/app");
  };

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
      <header className="sticky top-0 z-40 bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-600 text-white shadow-sm">
        <div className="flex h-14 items-center gap-3 px-4">
          <Logo size={30} className="rounded-lg bg-white p-0.5" />
          <span className="font-bold">ถุงเขียว <span className="font-medium text-white/50">· บริษัท (Admin)</span></span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="hidden text-sm text-white/70 lg:block">{currentUser.name}{currentUser.owner && " · เจ้าของระบบ"}</span>
            <Link href="/app" className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-white/80 hover:bg-white/10"><LayoutGrid className="h-4 w-4" /> <span className="hidden sm:inline">สลับระบบ</span></Link>
            <button onClick={doLogout} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-white/80 hover:bg-white/10"><LogOut className="h-4 w-4" /> <span className="hidden sm:inline">ออก</span></button>
          </div>
        </div>
        {/* Mobile horizontal nav */}
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-white/10 bg-white px-3 py-2 md:hidden">
          {items.map((n) => <NavLink key={n.href} n={n} mobile />)}
        </nav>
      </header>

      <div className="flex">
        {/* Desktop left sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-neutral-200 bg-white px-3 py-4 md:flex">
          {nav.map((n) => <NavLink key={n.href} n={n} />)}
          {currentUser.owner && (
            <>
              <div className="my-2 border-t border-neutral-100" />
              <NavLink n={OWNER_LINK} />
            </>
          )}
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
