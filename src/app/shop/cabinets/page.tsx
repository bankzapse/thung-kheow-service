"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { cabinetsWithCounts, dropGoSummary } from "@/lib/selectors";
import { displayCabinetCode } from "@/lib/types";
import { formatBaht } from "@/lib/utils";
import { Box, MapPin, PackageOpen, PackageCheck, Coins, ChevronRight, Inbox } from "lucide-react";

export default function CabinetsPage() {
  const { db } = useStore();
  // แสดงเฉพาะตู้ที่ใช้งานจริง (สังกัดแฟรนไชส์) — ซ่อนตู้ว่างในคลังที่ยังไม่ได้ติดตั้ง
  const cabinets = cabinetsWithCounts(db).filter((c) => c.franchiseId);
  const s = dropGoSummary(db);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">ตู้ Drop Bag</h1>
        <p className="text-sm text-neutral-500">คัดแยก & ตีราคาถุงที่หย่อนในตู้ · แตะที่ตู้เพื่อจัดการถุง</p>
      </div>

      {/* สรุปรวม */}
      <div className="grid grid-cols-3 gap-4">
        <Summary icon={<PackageOpen className="h-5 w-5" />} value={`${s.pendingBags}`} label="ถุงรอคัดแยก" tone="amber" />
        <Summary icon={<PackageCheck className="h-5 w-5" />} value={`${s.creditedBags}`} label="คัดแยกแล้ว" tone="brand" />
        <Summary icon={<Coins className="h-5 w-5" />} value={formatBaht(s.pointsIssued)} label="คะแนนรวมทั้งหมด" tone="gold" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cabinets.map((c) => (
          <Link key={c.id} href={`/shop/cabinets/${c.id}`} className="card-tap flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <Box className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-neutral-800">{c.name}</p>
                <p className="font-mono text-xs font-semibold text-brand-700">{displayCabinetCode(c.code)}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-neutral-300" />
            </div>
            <p className="flex items-center gap-1 text-xs text-neutral-500">
              <MapPin className="h-3.5 w-3.5" /> {c.location.address}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className={`chip ${c.pending > 0 ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-500"}`}>
                <PackageOpen className="h-3.5 w-3.5" /> {c.pending} รอคัดแยก
              </span>
              <span className="chip bg-brand-100 text-brand-700">
                <PackageCheck className="h-3.5 w-3.5" /> {c.credited} คัดแยกแล้ว
              </span>
              <span className="chip bg-neutral-100 text-neutral-500">{c.total} ถุงรวม</span>
            </div>
          </Link>
        ))}
        {cabinets.length === 0 && (
          <div className="card col-span-full flex flex-col items-center gap-2 py-12 text-center text-neutral-400">
            <Inbox className="h-8 w-8" /> ยังไม่มีตู้ · ตู้ถูกเพิ่มโดยแฟรนไชส์
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({ icon, value, label, tone }: { icon: React.ReactNode; value: string; label: string; tone: "amber" | "brand" | "gold" }) {
  const ring = tone === "amber" ? "bg-amber-100 text-amber-600" : tone === "brand" ? "bg-brand-100 text-brand-700" : "bg-gold/15 text-gold-dark";
  return (
    <div className="card">
      <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${ring}`}>{icon}</span>
      <p className="text-2xl font-extrabold text-neutral-800">{value}</p>
      <p className="text-xs text-neutral-400">{label}</p>
    </div>
  );
}
