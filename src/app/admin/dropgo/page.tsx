"use client";

import { useStore } from "@/lib/store";
import { dropGoSummary, recentCreditedBags, pendingRedemptions } from "@/lib/selectors";
import { formatBaht, thaiDateTime } from "@/lib/utils";
import { POINTS_PER_BAHT } from "@/lib/types";
import { Box, PackageOpen, Coins, Banknote, Recycle, Trophy, Clock } from "lucide-react";

export default function AdminDropGoPage() {
  const { db } = useStore();
  const s = dropGoSummary(db);
  const recent = recentCreditedBags(db, 8);
  const pendingRedeem = pendingRedemptions(db);
  const maxCab = Math.max(1, ...s.cabinets.map((c) => c.total));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">ภาพรวม Drop &amp; Go</h1>
        <p className="text-sm text-neutral-500">ตู้ · ถุงตาข่าย · คะแนน · การแลกเงิน</p>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<Box className="h-5 w-5" />} label="ตู้ทั้งหมด" value={`${s.cabinetCount}`} sub={`${s.bagCount} ถุงสะสม`} tone="brand" />
        <Stat icon={<PackageOpen className="h-5 w-5" />} label="ถุงรอคัดแยก" value={`${s.pendingBags}`} sub={`ให้คะแนนแล้ว ${s.creditedBags}`} tone={s.pendingBags > 0 ? "amber" : undefined} />
        <Stat icon={<Coins className="h-5 w-5" />} label="คะแนนจ่ายรวม" value={formatBaht(s.pointsIssued)} sub={`คงเหลือในระบบ ${formatBaht(s.pointsOutstanding)}`} tone="gold" />
        <Stat icon={<Banknote className="h-5 w-5" />} label="จ่ายเงินแลกแล้ว" value={`฿${formatBaht(s.redeemPaidBaht)}`} sub={`รอโอน ${s.redeemPending} · ฿${formatBaht(s.redeemPendingBaht)}`} tone={s.redeemPending > 0 ? "amber" : "brand"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* cabinets */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-1.5 font-bold text-neutral-800"><Box className="h-4 w-4 text-brand-600" /> ตู้ (เรียงตามปริมาณถุง)</h2>
          {s.cabinets.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">ยังไม่มีตู้</p>
          ) : (
            <div className="space-y-3">
              {s.cabinets.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <p className="truncate text-sm font-semibold text-neutral-800">{c.name}</p>
                    <p className="font-mono text-[11px] text-neutral-400">{c.code}</p>
                  </div>
                  <div className="h-6 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div className="flex h-full items-center justify-end rounded-full bg-brand-500 px-2 text-[11px] font-bold text-white" style={{ width: `${Math.max(12, (c.total / maxCab) * 100)}%` }}>
                      {c.total}
                    </div>
                  </div>
                  {c.pending > 0 && <span className="chip bg-amber-100 text-amber-700">{c.pending} รอ</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* pending redemptions */}
        <div className="card">
          <h2 className="mb-3 flex items-center gap-1.5 font-bold text-neutral-800"><Clock className="h-4 w-4 text-amber-500" /> คำขอแลกเงินรอโอน ({pendingRedeem.length})</h2>
          {pendingRedeem.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">ไม่มีคำขอค้าง 🎉</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {pendingRedeem.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Banknote className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">{r.userName}</p>
                    <p className="text-xs text-neutral-400">{r.code} · {thaiDateTime(r.requestedAt)}</p>
                  </div>
                  <span className="text-sm font-bold text-neutral-800">฿{formatBaht(r.amountBaht)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* recent activity */}
      <div className="card">
        <h2 className="mb-3 flex items-center gap-1.5 font-bold text-neutral-800"><Trophy className="h-4 w-4 text-gold-dark" /> ถุงที่เพิ่งให้คะแนน</h2>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">ยังไม่มีถุงที่ให้คะแนน</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
                  <th className="py-2 font-medium">รหัสถุง</th>
                  <th className="py-2 font-medium">คนทิ้ง</th>
                  <th className="py-2 font-medium">เมื่อ</th>
                  <th className="py-2 text-right font-medium">มูลค่า</th>
                  <th className="py-2 text-right font-medium">คะแนน</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((b) => (
                  <tr key={b.id} className="border-b border-neutral-50">
                    <td className="py-2 font-mono text-neutral-700">{b.qr}</td>
                    <td className="py-2 text-neutral-600">{b.userName}</td>
                    <td className="py-2 text-neutral-400">{b.creditedAt ? thaiDateTime(b.creditedAt) : ""}</td>
                    <td className="py-2 text-right font-medium text-neutral-700">฿{formatBaht(b.valueBaht ?? 0)}</td>
                    <td className="py-2 text-right"><span className="inline-flex items-center gap-1 font-bold text-brand-700"><Coins className="h-3.5 w-3.5" />{formatBaht(b.points ?? 0)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 flex items-center gap-1 text-xs text-neutral-400"><Recycle className="h-3.5 w-3.5" /> คะแนน = มูลค่า × {POINTS_PER_BAHT} · อัปเดตเมื่อทีมงานคัดแยกเสร็จ</p>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "brand" | "gold" | "amber" }) {
  const toneCls =
    tone === "brand" ? "bg-brand-100 text-brand-700" : tone === "gold" ? "bg-gold/15 text-gold-dark" : tone === "amber" ? "bg-amber-100 text-amber-600" : "bg-neutral-100 text-neutral-500";
  return (
    <div className="card flex flex-col gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneCls}`}>{icon}</div>
      <div>
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="mt-0.5 text-[26px] font-extrabold leading-tight tracking-tight text-neutral-800">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
      </div>
    </div>
  );
}
