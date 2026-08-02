"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { billsForBuyer, expensesForBuyer, centralPrice } from "@/lib/selectors";
import { formatBaht, thaiMonthLabel, thaiDate, currentMonth } from "@/lib/utils";
import { csvCell } from "@/lib/_core/csv";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Download, TrendingUp, TrendingDown, Wallet } from "lucide-react";

const CATEGORIES = ["น้ำมัน", "ค่าแรง", "ค่าเช่า", "ซ่อมบำรุง", "อื่นๆ"];

function todayInput() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AccountingPage() {
  const { db, currentUser, addExpense, removeExpense } = useStore();
  const u = currentUser!;
  const month = currentMonth();

  const [cat, setCat] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState("");

  const monthBills = useMemo(
    () => billsForBuyer(db, u.id).filter((b) => b.status === "paid" && b.date.slice(0, 7) === month),
    [db, u.id, month],
  );
  const monthExpenses = useMemo(
    () => expensesForBuyer(db, u.id).filter((e) => e.date.slice(0, 7) === month),
    [db, u.id, month],
  );

  const goods = monthBills.reduce((s, b) => s + b.goodsTotal, 0);
  const netPaid = monthBills.reduce((s, b) => s + b.netPaid, 0);
  const fee = monthBills.reduce((s, b) => s + b.fee, 0); // ค่าคอมจ่ายบริษัท (ต้นทุน)
  // กำไรขั้นต้น = ส่วนต่างอัตราเลทโรงงาน − ราคาที่รับซื้อ (ประมาณด้วยอัตราเลทปัจจุบัน)
  const margin = monthBills.reduce(
    (s, b) => s + b.items.reduce((t, it) => t + Math.max(0, centralPrice(db, it.materialId) - it.pricePerUnit) * it.qty, 0),
    0,
  );
  const expTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const profit = margin - fee - expTotal;

  const submit = () => {
    const amt = Number(amount.replace(/\D/g, "")) || 0;
    if (amt <= 0) return;
    addExpense({ category: cat, amount: amt, date: new Date(date).toISOString(), note: note.trim() || undefined });
    setAmount("");
    setNote("");
  };

  const exportCSV = () => {
    const head = ["เลขบิล", "วันที่", "ผู้ขาย", "ยอดรับซื้อ", "ค่าคอมบริษัท", "จ่ายผู้ขาย", "ชำระ"];
    const rows = monthBills.map((b) => [b.code, thaiDate(b.date), b.sellerName, b.goodsTotal, b.fee, b.netPaid, b.paymentMethod]);
    // escape ทีละช่อง — เดิม join(",") ดิบ ๆ ทำให้ชื่อผู้ขายที่มีลูกน้ำทำ CSV เพี้ยนทั้งแถว
    const csv = [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bills-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">บัญชี</h1>
          <p className="text-sm text-neutral-500">สรุปเดือน{thaiMonthLabel(month)}</p>
        </div>
        <button onClick={exportCSV} className="btn-outline !px-3 !py-2 text-sm">
          <Download className="h-4 w-4" /> ส่งออก CSV
        </button>
      </div>

      {/* P&L */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<Wallet className="h-5 w-5" />} label="ยอดรับซื้อ" value={`฿${formatBaht(goods)}`} sub={`${monthBills.length} บิล · จ่ายผู้ขาย ฿${formatBaht(netPaid)}`} />
        <Stat icon={<TrendingUp className="h-5 w-5" />} label="กำไรขั้นต้น (ส่วนต่างโรงงาน)" value={`฿${formatBaht(margin)}`} tone="brand" />
        <Stat icon={<TrendingDown className="h-5 w-5" />} label="รายจ่าย + ค่าคอม" value={`฿${formatBaht(expTotal + fee)}`} sub={`ค่าคอมบริษัท ฿${formatBaht(fee)}`} tone="danger" />
        <Stat icon={<TrendingUp className="h-5 w-5" />} label="กำไรสุทธิ (ประมาณ)" value={`฿${formatBaht(profit)}`} tone={profit >= 0 ? "brand" : "danger"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* add expense */}
        <div className="card h-fit">
          <h2 className="mb-3 font-bold text-neutral-800">บันทึกรายจ่าย</h2>
          <div className="space-y-3">
            <div>
              <label className="label">หมวด</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={cn("rounded-lg border px-2.5 py-1.5 text-xs font-medium", cat === c ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-500")}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">จำนวนเงิน</label>
              <input className="input" inputMode="numeric" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div>
              <label className="label">วันที่</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">หมายเหตุ (ไม่บังคับ)</label>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <button onClick={submit} className="btn-primary w-full">
              <Plus className="h-4 w-4" /> บันทึกรายจ่าย
            </button>
          </div>
        </div>

        {/* expenses list */}
        <div className="card">
          <h2 className="mb-2 font-bold text-neutral-800">รายจ่ายเดือนนี้</h2>
          {monthExpenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">ยังไม่มีรายจ่าย</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {monthExpenses.map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className="chip bg-neutral-100 text-neutral-500">{e.category}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-700">{e.note || e.category}</p>
                    <p className="text-xs text-neutral-400">{thaiDate(e.date)}</p>
                  </div>
                  <span className="font-semibold text-red-500">−฿{formatBaht(e.amount)}</span>
                  <button onClick={() => removeExpense(e.id)} className="text-neutral-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "brand" | "danger";
}) {
  return (
    <div className="card flex flex-col gap-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          tone === "brand" ? "bg-brand-100 text-brand-700" : tone === "danger" ? "bg-red-100 text-red-600" : "bg-neutral-100 text-neutral-500"
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="mt-0.5 text-[26px] font-extrabold leading-tight tracking-tight text-neutral-800">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
      </div>
    </div>
  );
}
