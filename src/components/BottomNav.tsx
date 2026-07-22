"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PICKUP_ENABLED } from "@/lib/features";
import { Home, ClipboardList, Wallet, CalendarClock, Coins, PackageCheck, User } from "lucide-react";

type Item = { href: string; label: string; icon: React.ElementType };

const NAV: Record<"seller" | "buyer", Item[]> = {
  seller: [
    { href: "/home", label: "หน้าแรก", icon: Home },
    { href: "/status", label: "สถานะ", icon: PackageCheck },
    { href: "/points", label: "คะแนน", icon: Coins },
    { href: "/profile", label: "โปรไฟล์", icon: User },
  ],
  buyer: [
    { href: "/home", label: "หน้าแรก", icon: Home },
    { href: "/jobs", label: "งานของฉัน", icon: ClipboardList },
    { href: "/wallet", label: "เครดิต", icon: Coins },
    { href: "/schedule", label: "ตาราง", icon: CalendarClock },
    { href: "/income", label: "บัญชี", icon: Wallet },
  ],
};

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();

  // admin/franchise ไม่ใช้ bottom nav (มี layout แยก)
  if (role !== "seller" && role !== "buyer") return null;
  // Hide tab bar on full-screen task pages (they have their own action bars)
  // /drop ไม่อยู่ในรายการนี้แล้ว — Rich Menu ใน LINE ลิงก์ตรงมาหน้านี้ ถ้าไม่มีแท็บ
  // ผู้ใช้จะไปหน้าอื่นไม่ได้เลย (แถบ "ยืนยันหย่อนถุง" ของหน้านั้นถูกยกขึ้นเหนือแท็บแทน)
  if (
    pathname.startsWith("/create") ||
    pathname.startsWith("/job/") ||
    pathname.startsWith("/rewards")
  ) {
    return null;
  }

  // โปรดักชัน Drop-only: ซ่อนแท็บที่ผูกกับระบบรับซื้อของเก่า
  const hideForDrop = new Set(PICKUP_ENABLED ? [] : ["/jobs", "/income", "/schedule"]);
  const items = NAV[role].filter((it) => !hideForDrop.has(it.href));

  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-neutral-100 bg-white/95 backdrop-blur">
      <div className="flex items-stretch justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-1.5">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors",
              active(it.href) ? "text-brand-700" : "text-neutral-400",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-[52px] items-center justify-center rounded-full transition-all duration-200",
                active(it.href) ? "bg-brand-100" : "bg-transparent",
              )}
            >
              <it.icon className="h-[21px] w-[21px]" strokeWidth={active(it.href) ? 2.4 : 2} />
            </span>
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
