"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { luckyDrawConfig, entriesForUser } from "@/lib/luckyDraw";
import { formatBaht } from "@/lib/utils";
import { Gift, ChevronRight } from "lucide-react";

/**
 * การ์ดทางเข้าหน้าชิงโชค (โชว์เฉพาะเมื่อเปิดระบบ + เป็นผู้ขาย)
 * วางบนหน้าแรก/หน้าคะแนน ให้ผู้ใช้เข้าถึงสิทธิ์ลุ้น + ผลรางวัลจากใน LINE ได้
 */
export function LuckyDrawCard() {
  const { db, currentUser } = useStore();
  const cfg = luckyDrawConfig(db);
  if (!cfg.enabled || !currentUser || currentUser.role !== "seller") return null;
  const entries = entriesForUser(db, currentUser.id, cfg);

  return (
    <Link href="/rewards" className="card-tap block">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
          <Gift className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-neutral-800">{cfg.title}</p>
          <p className="text-xs text-neutral-400">ทุกมูลค่า ฿{formatBaht(cfg.bahtPerEntry)} = 1 สิทธิ์ · ลุ้นรางวัลใหญ่</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-extrabold leading-none text-gold-dark">{formatBaht(entries)}</p>
          <p className="text-[11px] text-neutral-400">สิทธิ์</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-neutral-300" />
      </div>
    </Link>
  );
}
