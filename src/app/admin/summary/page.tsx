"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { financialSummary } from "@/lib/selectors";
import { formatBaht } from "@/lib/utils";
import { TrendingUp, Wallet, Building2, Coins, Factory, HandCoins, Landmark, PiggyBank, Gift, Sparkles } from "lucide-react";

type Period = "day" | "month" | "year" | "all";
const PERIODS: [Period, string][] = [["day", "วันนี้"], ["month", "เดือนนี้"], ["year", "ปีนี้"], ["all", "ทั้งหมด"]];
function periodSince(p: Period): Date | undefined {
  const n = new Date();
  if (p === "day") return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  if (p === "month") return new Date(n.getFullYear(), n.getMonth(), 1);
  if (p === "year") return new Date(n.getFullYear(), 0, 1);
  return undefined;
}

export default function AdminSummaryPage() {
  const { db } = useStore();
  const [period, setPeriod] = useState<Period>("month");
  const s = financialSummary(db, periodSince(period));
  const cashOut = s.franchisePaid + s.redeemPaid;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-800"><PiggyBank className="h-6 w-6 text-brand-600" /> สรุปการเงินรวม</h1>
        <p className="text-sm text-neutral-500">รายได้ · กำไร · เงินลงทุน ของบริษัททั้งหมด — เลือกช่วงเวลา รายวัน / เดือน / ปี</p>
      </div>

      {/* ช่วงเวลา */}
      <div className="inline-flex rounded-xl bg-neutral-100 p-1">
        {PERIODS.map(([k, label]) => (
          <button key={k} onClick={() => setPeriod(k)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${period === k ? "bg-white text-brand-700 shadow-sm" : "text-neutral-500"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* 3 ตัวเลขหลัก */}
      <div className="grid gap-4 sm:grid-cols-3">
        <BigCard icon={<TrendingUp className="h-6 w-6" />} tone="brand" label="รายได้รวม" value={s.factoryRevenue} sub={`จากขายให้โรงงาน · ${s.saleCount} ครั้ง`} />
        <BigCard icon={<Wallet className="h-6 w-6" />} tone="gold" label="กำไรรวม" value={s.factoryProfit} sub={s.factoryRevenue > 0 ? `margin ${((s.factoryProfit / s.factoryRevenue) * 100).toFixed(0)}%` : "—"} />
        <BigCard icon={<Building2 className="h-6 w-6" />} tone="slate" label="เงินลงทุน (ตู้)" value={s.cabinetInvest} sub={`${s.cabinetCount} ตู้ × ฿14,999`} />
      </div>

      {/* ต้นทุน & เงินจ่ายออก */}
      <div className="card">
        <h2 className="mb-1 font-bold text-neutral-800">ต้นทุน & เงินจ่ายออก</h2>
        <p className="mb-3 text-xs text-neutral-400">รายจ่ายในช่วงที่เลือก</p>
        <div className="divide-y divide-neutral-100">
          <Row icon={<Coins className="h-4 w-4" />} label="มูลค่ารับซื้อ (จ่ายผู้ขายเป็นคะแนน)" value={s.purchaseCost} hint="ต้นทุนของเข้า = คะแนนที่ตีให้ถุง" />
          <Row icon={<Gift className="h-4 w-4" />} label="โบนัสภารกิจ/ขั้นบันได (แต้มที่แจก)" value={s.bonusPaid} hint="รางวัลที่บริษัทแจกเพิ่มเกินมูลค่าวัสดุ" />
          <Row icon={<Landmark className="h-4 w-4" />} label="โอนส่วนแบ่งให้แฟรนไชส์" value={s.franchisePaid} />
          <Row icon={<HandCoins className="h-4 w-4" />} label="จ่ายเงินแลก (ผู้ขายถอน)" value={s.redeemPaid} />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5 ring-1 ring-neutral-100">
          <span className="text-sm font-semibold text-neutral-700">รวมเงินสดจ่ายออก (โอนแฟรนไชส์ + จ่ายแลก)</span>
          <span className="text-lg font-extrabold text-neutral-800">฿{formatBaht(cashOut)}</span>
        </div>
      </div>

      {/* กำไรสุทธิ = กำไรโรงงาน − โบนัส − ค่าถอน */}
      <div className="card">
        <h2 className="mb-1 flex items-center gap-1.5 font-bold text-neutral-800"><Sparkles className="h-4 w-4 text-brand-600" /> กำไรสุทธิ</h2>
        <p className="mb-3 text-xs text-neutral-400">หักโบนัสที่แจก + เงินที่ผู้ขายถอนออกจากกำไรขายโรงงาน</p>
        <div className="divide-y divide-neutral-100">
          <CalcRow label="กำไรจากขายโรงงาน" value={s.factoryProfit} sign="+" />
          <CalcRow label="โบนัสภารกิจ/ขั้นบันได" value={s.bonusPaid} sign="−" />
          <CalcRow label="จ่ายเงินแลก (ผู้ขายถอน)" value={s.redeemPaid} sign="−" />
        </div>
        <div className={`mt-3 flex items-center justify-between rounded-xl px-3 py-3 ring-1 ${s.netProfit >= 0 ? "bg-brand-50 ring-brand-100" : "bg-red-50 ring-red-100"}`}>
          <span className={`text-sm font-bold ${s.netProfit >= 0 ? "text-brand-700" : "text-red-700"}`}>กำไรสุทธิ</span>
          <span className={`text-2xl font-extrabold ${s.netProfit >= 0 ? "text-brand-700" : "text-red-600"}`}>฿{formatBaht(s.netProfit)}</span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">
          หมายเหตุ: “จ่ายเงินแลก” รวมทั้งคะแนนพื้นฐาน (ค่าวัสดุ) ซึ่งบางส่วนถูกนับเป็นต้นทุนใน “กำไรขายโรงงาน” แล้ว —
          ตัวเลขนี้จึงเป็นมุมมองอนุรักษ์นิยม (ระวังต่ำ) · ยังไม่ได้หักส่วนแบ่งแฟรนไชส์
        </p>
      </div>

      <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800 ring-1 ring-brand-100">
        <p className="mb-1 flex items-center gap-1.5 font-semibold"><Factory className="h-4 w-4" /> กำไรบริษัทมาจาก 3 ทาง</p>
        <ul className="ml-5 list-disc space-y-0.5 text-brand-700/90">
          <li>ส่วนต่างขายให้โรงงาน (ราคาขาย − ราคาที่จ่ายผู้ขาย) — แสดงเป็น “กำไรรวม” ด้านบน</li>
          <li>ค่าคอมมิชชัน & ส่วนแบ่งสัญญาตู้จากแฟรนไชส์ (ดูละเอียดที่เมนู “แฟรนไชส์”)</li>
          <li>เงินลงทุนค่าตู้จะทยอยคืนทุนผ่านสัญญาเช่าซื้อของแต่ละแฟรนไชส์</li>
        </ul>
      </div>
    </div>
  );
}

function BigCard({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: number; sub?: string; tone: "brand" | "gold" | "slate" }) {
  const toneCls = tone === "brand" ? "bg-brand-100 text-brand-700" : tone === "gold" ? "bg-gold/15 text-gold-dark" : "bg-slate-100 text-slate-600";
  return (
    <div className="card flex flex-col gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneCls}`}>{icon}</div>
      <div>
        <p className="text-sm text-neutral-400">{label}</p>
        <p className="text-3xl font-extrabold leading-tight tracking-tight text-neutral-800">฿{formatBaht(value)}</p>
        {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
      </div>
    </div>
  );
}

function CalcRow({ label, value, sign }: { label: string; value: number; sign: "+" | "−" }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-neutral-600">{label}</span>
      <span className={`text-base font-bold tabular-nums ${sign === "−" ? "text-red-500" : "text-neutral-800"}`}>{sign} ฿{formatBaht(value)}</span>
    </div>
  );
}

function Row({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint?: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-700">{label}</p>
        {hint && <p className="text-xs text-neutral-400">{hint}</p>}
      </div>
      <span className="text-base font-bold text-neutral-800">฿{formatBaht(value)}</span>
    </div>
  );
}
