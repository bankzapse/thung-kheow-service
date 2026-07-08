"use client";

import { usePathname } from "next/navigation";

/**
 * เลือก shell ตาม route:
 * - /shop, /admin → Full web (เต็มจอ desktop)
 * - อื่นๆ → มือถือ (max-w-md จัดกลาง)
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const desktop =
    pathname.startsWith("/shop") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/franchise") ||
    pathname.startsWith("/reports");
  if (desktop) return <div className="min-h-dvh w-full">{children}</div>;
  return <div className="app-shell">{children}</div>;
}
