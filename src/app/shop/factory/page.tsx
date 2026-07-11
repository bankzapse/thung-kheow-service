"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { MATERIALS } from "@/lib/materials";
import { centralPrice, factoryPrice, factoryProfitSummary } from "@/lib/selectors";
import type { FactorySaleItem } from "@/lib/types";
import { formatBaht, thaiDateTime } from "@/lib/utils";
import { Factory, TrendingUp, Coins, Wallet, Scale } from "lucide-react";

type Period = "day" | "month" | "all";
function periodSince(p: Period): Date | undefined {
  const n = new Date();
  if (p === "day") return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  if (p === "month") return new Date(n.getFullYear(), n.getMonth(), 1);
  return undefined;
}

export default function ShopFactoryPage() {
  const { db, recordFactorySale } = useStore();
  const [period, setPeriod] = useState<Period>("all");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [fp, setFp] = useState<Record<string, string>>({});
  const [factoryName, setFactoryName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const rows = MATERIALS.map((m) => {
    const kg = Math.max(0, Number(qty[m.id] || 0));
    const seller = centralPrice(db, m.id);
    const fprice = fp[m.id] !== undefined && fp[m.id] !== "" ? Math.max(0, Number(fp[m.id])) : factoryPrice(db, m.id);
    const revenue = Math.round(kg * fprice);
    const cost = Math.round(kg * seller);
    return { m, kg, seller, fprice, revenue, cost, profit: revenue - cost };
  });
  const active = rows.filter((r) => r.kg > 0);
  const totalRev = active.reduce((s, r) => s + r.revenue, 0);
  const totalCost = active.reduce((s, r) => s + r.cost, 0);
  const totalProfit = totalRev - totalCost;
  const canSave = active.length > 0 && !busy;

  const submit = async () => {
    if (!canSave) return;
    setBusy(true);
    const items: FactorySaleItem[] = active.map((r) => ({
      materialId: r.m.id, name: r.m.name, qtyKg: r.kg, factoryPrice: r.fprice, sellerPrice: r.seller,
      revenue: r.revenue, cost: r.cost, profit: r.profit,
    }));
    const ok = recordFactorySale(items, factoryName, note);
    setBusy(false);
    if (ok) { setQty({}); setFp({}); setFactoryName(""); setNote(""); }
  };

  const since = periodSince(period);
  const cutoff = since?.toISOString();
  const summary = factoryProfitSummary(db, since);
  const recent = (db.factorySales ?? []).filter((s) => !cutoff || s.soldAt >= cutoff).slice(0, 8);

  return (
    <div className="space-y-5 pb-28">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-800"><Factory className="h-6 w-6 text-brand-600" /> ขายให้โรงงานของเก่า</h1>
        <p className="text-sm text-neutral-500">กรอกน้ำหนักที่ขาย + ราคาโรงงาน — ระบบคิดกำไร (ราคาขาย − ราคาที่จ่ายผู้ขาย) ให้อัตโนมัติ</p>
      </div>

      {/* เลือกช่วงเวลา */}
      <div className="inline-flex rounded-xl bg-neutral-100 p-1">
        {([["day", "วันนี้"], ["month", "เดือนนี้"], ["all", "ทั้งหมด"]] as [Period, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setPeriod(k)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${period === k ? "bg-white text-brand-700 shadow-sm" : "text-neutral-500"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* สรุปกำไรตามช่วงเวลา */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<Wallet className="h-5 w-5" />} label="รายได้จากโรงงาน" value={`฿${formatBaht(summary.revenue)}`} tone="brand" />
        <Stat icon={<Coins className="h-5 w-5" />} label="ต้นทุน (จ่ายผู้ขาย)" value={`฿${formatBaht(summary.cost)}`} />
        <Stat icon={<TrendingUp className="h-5 w-5" />} label="กำไรบริษัทรวม" value={`฿${formatBaht(summary.profit)}`} tone="gold" sub={`margin ${summary.marginPct.toFixed(0)}%`} />
        <Stat icon={<Scale className="h-5 w-5" />} label="ขายไปแล้ว" value={`${formatBaht(summary.totalKg)} กก.`} sub={`${summary.saleCount} ครั้ง`} />
      </div>

      {/* ฟอร์มบันทึกการขาย */}
      <div className="card">
        <h2 className="mb-3 font-bold text-neutral-800">บันทึกการขายครั้งใหม่</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-400">
                <th className="pb-2">วัสดุ</th>
                <th className="pb-2 text-right">น้ำหนัก (กก.)</th>
                <th className="pb-2 text-right">ราคาโรงงาน/กก.</th>
                <th className="pb-2 text-right">จ่ายผู้ขาย/กก.</th>
                <th className="pb-2 text-right">กำไร</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <tr key={r.m.id} className={r.kg > 0 ? "bg-brand-50/40" : ""}>
                  <td className="py-2"><span className="mr-1">{r.m.emoji}</span> {r.m.name}</td>
                  <td className="py-2 text-right">
                    <input inputMode="decimal" value={qty[r.m.id] ?? ""} onChange={(e) => setQty({ ...qty, [r.m.id]: e.target.value.replace(/[^0-9.]/g, "") })}
                      className="input !w-24 !py-1.5 text-right" placeholder="0" />
                  </td>
                  <td className="py-2 text-right">
                    <input inputMode="numeric" value={fp[r.m.id] ?? String(factoryPrice(db, r.m.id) || "")} onChange={(e) => setFp({ ...fp, [r.m.id]: e.target.value.replace(/[^0-9]/g, "") })}
                      className="input !w-20 !py-1.5 text-right" placeholder="0" />
                  </td>
                  <td className="py-2 text-right text-neutral-400">฿{formatBaht(r.seller)}</td>
                  <td className={`py-2 text-right font-semibold ${r.profit > 0 ? "text-brand-700" : r.profit < 0 ? "text-red-500" : "text-neutral-400"}`}>
                    {r.kg > 0 ? `฿${formatBaht(r.profit)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">ชื่อโรงงาน (ไม่บังคับ)</label>
            <input className="input" value={factoryName} onChange={(e) => setFactoryName(e.target.value)} placeholder="เช่น โรงงานรีไซเคิล ABC" />
          </div>
          <div>
            <label className="label">หมายเหตุ (ไม่บังคับ)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น รอบส่งประจำเดือน" />
          </div>
        </div>

        {/* สรุปรายการนี้ */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-100">
            <p className="text-xs text-neutral-400">รายได้</p>
            <p className="text-lg font-extrabold text-neutral-800">฿{formatBaht(totalRev)}</p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-100">
            <p className="text-xs text-neutral-400">ต้นทุน</p>
            <p className="text-lg font-extrabold text-neutral-800">฿{formatBaht(totalCost)}</p>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100">
            <p className="flex items-center gap-1 text-xs text-brand-700"><TrendingUp className="h-3.5 w-3.5" /> กำไรบริษัท</p>
            <p className="text-lg font-extrabold text-brand-700">฿{formatBaht(totalProfit)}</p>
          </div>
        </div>

        <button onClick={submit} disabled={!canSave} className="btn-primary mt-4 w-full disabled:opacity-50">
          <Factory className="h-4 w-4" /> บันทึกการขาย {active.length > 0 ? `(${active.length} วัสดุ)` : ""}
        </button>
      </div>

      {/* ประวัติการขาย */}
      <div className="card">
        <h2 className="mb-3 font-bold text-neutral-800">ประวัติการขายล่าสุด</h2>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">ยังไม่มีการขายให้โรงงาน</p>
        ) : (
          <div className="space-y-2">
            {recent.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-100">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700"><Factory className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-800">{s.factoryName || "โรงงานของเก่า"} <span className="font-normal text-neutral-400">· {s.items.length} วัสดุ</span></p>
                  <p className="text-xs text-neutral-400">{thaiDateTime(s.soldAt)} · รายได้ ฿{formatBaht(s.revenue)} − ต้นทุน ฿{formatBaht(s.cost)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-neutral-400">กำไร</p>
                  <p className="font-bold text-brand-700">฿{formatBaht(s.profit)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "brand" | "gold" }) {
  const toneCls = tone === "brand" ? "bg-brand-100 text-brand-700" : tone === "gold" ? "bg-gold/15 text-gold-dark" : "bg-neutral-100 text-neutral-500";
  return (
    <div className="card flex flex-col gap-2">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneCls}`}>{icon}</div>
      <div>
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="text-xl font-extrabold leading-tight text-neutral-800">{value}</p>
        {sub && <p className="text-xs text-neutral-400">{sub}</p>}
      </div>
    </div>
  );
}
