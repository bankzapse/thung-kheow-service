"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { MATERIALS } from "@/lib/materials";
import { centralPrice, factoryPrice, factoryProfitSummary } from "@/lib/selectors";
import { formatBaht, thaiDateTime } from "@/lib/utils";
import { Factory, TrendingUp, Wallet, Coins, Scale, Check } from "lucide-react";

type Period = "day" | "month" | "all";
function periodSince(p: Period): Date | undefined {
  const n = new Date();
  if (p === "day") return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  if (p === "month") return new Date(n.getFullYear(), n.getMonth(), 1);
  return undefined;
}

export default function AdminFactoryPage() {
  const { db, setFactoryPrice } = useStore();
  const [period, setPeriod] = useState<Period>("all");
  const since = periodSince(period);
  const summary = factoryProfitSummary(db, since);
  const cutoff = since?.toISOString();
  const recent = (db.factorySales ?? []).filter((s) => !cutoff || s.soldAt >= cutoff).slice(0, 12);

  const [edit, setEdit] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const save = (materialId: string) => {
    const v = edit[materialId];
    if (v === undefined || v === "") return;
    setFactoryPrice(materialId, Number(v));
    setSavedId(materialId);
    setEdit((e) => { const n = { ...e }; delete n[materialId]; return n; });
    setTimeout(() => setSavedId(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-800"><Factory className="h-6 w-6 text-brand-600" /> กำไรจากโรงงานของเก่า</h1>
        <p className="text-sm text-neutral-500">ตั้งราคาขายโรงงาน & ดูกำไรส่วนต่าง (ราคาขายโรงงาน − ราคาที่จ่ายผู้ขาย) — กำไรชั้นที่ 3 ของบริษัท</p>
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

      {/* สรุปกำไร */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<Wallet className="h-5 w-5" />} label="รายได้จากโรงงาน" value={`฿${formatBaht(summary.revenue)}`} tone="brand" />
        <Stat icon={<Coins className="h-5 w-5" />} label="ต้นทุน (จ่ายผู้ขาย)" value={`฿${formatBaht(summary.cost)}`} />
        <Stat icon={<TrendingUp className="h-5 w-5" />} label="กำไรบริษัทรวม" value={`฿${formatBaht(summary.profit)}`} tone="gold" sub={`margin ${summary.marginPct.toFixed(0)}%`} />
        <Stat icon={<Scale className="h-5 w-5" />} label="ขายไปแล้ว" value={`${formatBaht(summary.totalKg)} กก.`} sub={`${summary.saleCount} ครั้ง`} />
      </div>

      {/* ตั้งราคาขายโรงงาน */}
      <div className="card">
        <h2 className="mb-1 font-bold text-neutral-800">ตั้งราคาขายโรงงาน (บาท/กก.)</h2>
        <p className="mb-3 text-xs text-neutral-400">ค่านี้เป็นราคาเริ่มต้นตอนศูนย์คัดแยกบันทึกการขาย · ส่วนต่างจากราคาที่จ่ายผู้ขาย = กำไร/กก.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-400">
                <th className="pb-2">วัสดุ</th>
                <th className="pb-2 text-right">จ่ายผู้ขาย/กก.</th>
                <th className="pb-2 text-right">ราคาขายโรงงาน/กก.</th>
                <th className="pb-2 text-right">กำไร/กก.</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {MATERIALS.map((m) => {
                const seller = centralPrice(db, m.id);
                const fPrice = factoryPrice(db, m.id);
                const val = edit[m.id] ?? String(fPrice || "");
                const spread = Math.max(0, Number(val || 0)) - seller;
                return (
                  <tr key={m.id}>
                    <td className="py-2"><span className="mr-1">{m.emoji}</span> {m.name}</td>
                    <td className="py-2 text-right text-neutral-400">฿{formatBaht(seller)}</td>
                    <td className="py-2 text-right">
                      <input inputMode="numeric" value={val} onChange={(e) => setEdit({ ...edit, [m.id]: e.target.value.replace(/[^0-9]/g, "") })}
                        onKeyDown={(e) => e.key === "Enter" && save(m.id)} className="input !w-24 !py-1.5 text-right" placeholder="0" />
                    </td>
                    <td className={`py-2 text-right font-semibold ${spread > 0 ? "text-brand-700" : spread < 0 ? "text-red-500" : "text-neutral-400"}`}>฿{formatBaht(spread)}</td>
                    <td className="py-2 pl-2 text-right">
                      <button onClick={() => save(m.id)} className="btn-outline !px-3 !py-1.5 text-xs">
                        {savedId === m.id ? <><Check className="h-3.5 w-3.5 text-brand-600" /> บันทึก</> : "บันทึก"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* กำไรแยกตามวัสดุ */}
      {summary.byMaterial.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-bold text-neutral-800">กำไรแยกตามวัสดุ</h2>
          <div className="space-y-2">
            {summary.byMaterial.map((r) => (
              <div key={r.materialId} className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-100">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-800">{r.name}</p>
                  <p className="text-xs text-neutral-400">{formatBaht(r.kg)} กก. · รายได้ ฿{formatBaht(r.revenue)} − ต้นทุน ฿{formatBaht(r.cost)}</p>
                </div>
                <p className="font-bold text-brand-700">฿{formatBaht(r.profit)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ประวัติการขาย */}
      <div className="card">
        <h2 className="mb-3 font-bold text-neutral-800">ประวัติการขายให้โรงงาน</h2>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">ยังไม่มีการขายให้โรงงาน — ศูนย์คัดแยกบันทึกได้ที่เมนู “ขายให้โรงงาน”</p>
        ) : (
          <div className="space-y-2">
            {recent.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-100">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700"><Factory className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-800">{s.factoryName || "โรงงานของเก่า"} <span className="font-normal text-neutral-400">· {s.items.length} วัสดุ · โดย {s.soldByName || "-"}</span></p>
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
