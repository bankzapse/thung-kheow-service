"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Recycle, LayoutDashboard, ReceiptText, Wallet, Tag, ArrowLeft, Plus, Box, Banknote } from "lucide-react";

const NAV = [
  { href: "/shop", label: "ภาพรวม", icon: LayoutDashboard, exact: true },
  { href: "/shop/cabinets", label: "ตู้ Drop & Go", icon: Box },
  { href: "/shop/redemptions", label: "แลกเงิน", icon: Banknote },
  { href: "/shop/bills", label: "บิลรับซื้อ", icon: ReceiptText },
  { href: "/shop/accounting", label: "บัญชี", icon: Wallet },
  { href: "/shop/prices", label: "ราคา/วัสดุ", icon: Tag },
];

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const { ready, currentUser } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) router.replace("/login");
    else if (currentUser.role !== "buyer") router.replace("/home");
    else if (currentUser.status === "suspended") router.replace("/home");
  }, [ready, currentUser, router]);

  if (!ready || !currentUser || currentUser.role !== "buyer") {
    return <div className="grid min-h-dvh place-items-center text-neutral-400">กำลังโหลด…</div>;
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-dvh bg-neutral-100">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Recycle className="h-5 w-5" />
            </div>
            <span className="hidden font-bold text-neutral-800 sm:block">ร้านรับซื้อ · {currentUser.name}</span>
          </div>
          <nav className="ml-3 hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  isActive(n.href, n.exact) ? "bg-brand-50 text-brand-700" : "text-neutral-500 hover:bg-neutral-100",
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/shop/bills/new" className="btn-primary !px-3 !py-2 text-sm">
              <Plus className="h-4 w-4" /> สร้างบิล
            </Link>
            <Link href="/home" className="btn-ghost !px-2 !py-2 text-sm text-neutral-500">
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">กลับแอป</span>
            </Link>
          </div>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-neutral-100 px-3 py-1.5 md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-sm",
                isActive(n.href, n.exact) ? "bg-brand-50 text-brand-700" : "text-neutral-500",
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
