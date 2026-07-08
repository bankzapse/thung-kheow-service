"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/ui";
import { bagsForUser } from "@/lib/selectors";
import { BAG_STATUS_META } from "@/lib/types";
import { formatBaht, thaiDateTime } from "@/lib/utils";
import { Box, Coins, PackagePlus } from "lucide-react";

export default function StatusPage() {
  const { db, currentUser } = useStore();
  const u = currentUser!;
  const myBags = bagsForUser(db, u.id);

  const pending = myBags.filter((b) => b.status !== "credited").length;
  const credited = myBags.filter((b) => b.status === "credited").length;

  return (
    <div className="pb-24">
      <AppHeader title="สถานะถุง" subtitle="ติดตามถุงที่หย่อน & คะแนนที่ได้" />

      <div className="space-y-4 px-5 py-4">
        {/* summary */}
        <div className="card grid grid-cols-3 divide-x divide-neutral-100 text-center">
          <Stat label="ถุงทั้งหมด" value={`${myBags.length}`} />
          <Stat label="รอคัดแยก" value={`${pending}`} tone="amber" />
          <Stat label="ได้คะแนนแล้ว" value={`${credited}`} tone="brand" />
        </div>

        {myBags.length === 0 ? (
          <div className="card">
            <EmptyState icon="🧺" title="ยังไม่มีถุงที่หย่อน" hint="ไปที่ Drop Bag แล้วสแกน QR บนถุง" />
            <Link href="/drop" className="btn-primary mx-auto mt-1 w-full max-w-xs">
              <PackagePlus className="h-4 w-4" /> ไปหย่อนถุง (Drop Bag)
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="section-title">ถุงของฉัน</p>
              <Link href="/points" className="flex items-center gap-1 text-sm font-semibold text-brand-600">
                <Coins className="h-4 w-4" /> คะแนนของฉัน
              </Link>
            </div>
            <div className="space-y-2">
              {myBags.map((b) => {
                const m = BAG_STATUS_META[b.status];
                return (
                  <div key={b.id} className="card flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Box className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-medium text-neutral-800">{b.qr}</p>
                      <p className="text-xs text-neutral-400">{thaiDateTime(b.droppedAt)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`chip ${m.color}`}><span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} /> {m.label}</span>
                      {b.status === "credited" && b.points != null && (
                        <p className="mt-1 text-sm font-bold text-brand-700">+{formatBaht(b.points)} คะแนน</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "amber" | "brand" }) {
  const color = tone === "amber" ? "text-amber-600" : tone === "brand" ? "text-brand-700" : "text-neutral-800";
  return (
    <div className="px-2">
      <p className={`text-xl font-extrabold ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-neutral-400">{label}</p>
    </div>
  );
}
