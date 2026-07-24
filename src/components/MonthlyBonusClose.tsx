"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { sellerBonuses, isMonthBonusClosed } from "@/lib/rewards";
import { formatBaht, thaiMonthLabel } from "@/lib/utils";
import { Modal } from "@/components/ui";
import { Sparkles, CheckCircle2, Gift } from "lucide-react";

// เดือนล่าสุด 3 เดือน (YYYY-MM) สำหรับปิดยอด
const recentMonths = () => {
  const now = new Date();
  return [0, 1, 2].map((i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
};

/** บริษัทกดปิดยอดโบนัสประจำเดือน → เครดิตแต้มโบนัสให้ผู้ขายทีเดียว (กันจ่ายซ้ำ) */
export function MonthlyBonusClose() {
  const { db, closeMonthlyBonus } = useStore();
  const months = recentMonths();
  const [bonusMonth, setBonusMonth] = useState(months[0]);
  const [confirmClose, setConfirmClose] = useState(false);
  const bonusList = sellerBonuses(db, bonusMonth);
  const bonusTotal = bonusList.reduce((a, b) => a + b.bonus, 0);
  const bonusClosed = isMonthBonusClosed(db, bonusMonth);
  const doClose = () => { closeMonthlyBonus(bonusMonth); setConfirmClose(false); };

  return (
    <>
      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 font-bold text-neutral-800"><Sparkles className="h-4 w-4 text-gold-dark" /> ปิดยอดโบนัสประจำเดือน</h2>
          <select className="input w-auto !py-1.5 text-sm" value={bonusMonth} onChange={(e) => setBonusMonth(e.target.value)}>
            {months.map((m) => <option key={m} value={m}>{thaiMonthLabel(m)}</option>)}
          </select>
        </div>

        {bonusClosed ? (
          <div className="flex items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-700 ring-1 ring-brand-100">
            <CheckCircle2 className="h-5 w-5 shrink-0" /> ปิดยอด &amp; จ่ายโบนัส {thaiMonthLabel(bonusMonth)} เรียบร้อยแล้ว
          </div>
        ) : bonusList.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">ยังไม่มีผู้ขายที่ได้โบนัสในเดือนนี้</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between rounded-xl bg-gold/10 p-3 ring-1 ring-gold/20">
              <span className="text-sm text-neutral-600">ผู้ขายได้โบนัส <b className="text-neutral-800">{bonusList.length} ราย</b></span>
              <span className="flex items-center gap-1 text-lg font-extrabold text-gold-dark"><Gift className="h-5 w-5" /> +{formatBaht(bonusTotal)} แต้ม</span>
            </div>
            <div className="max-h-52 space-y-1.5 overflow-y-auto">
              {bonusList.slice(0, 20).map((b) => (
                <div key={b.userId} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm ring-1 ring-neutral-100">
                  <span className="truncate text-neutral-700">{b.name}</span>
                  <span className="shrink-0 font-semibold text-brand-700">+{formatBaht(b.bonus)} แต้ม</span>
                </div>
              ))}
              {bonusList.length > 20 && <p className="pt-1 text-center text-xs text-neutral-400">และอีก {bonusList.length - 20} ราย</p>}
            </div>
            <button className="btn-primary mt-3 w-full" onClick={() => setConfirmClose(true)}>
              <Gift className="h-4 w-4" /> ปิดยอด &amp; จ่ายโบนัส {thaiMonthLabel(bonusMonth)}
            </button>
          </>
        )}
        <p className="mt-2 text-[11px] text-neutral-400">โบนัส = ขั้นบันได (ตามจำนวนถุง) + ภารกิจที่ทำครบ · จ่ายครั้งเดียว/เดือน กันจ่ายซ้ำอัตโนมัติ</p>
      </div>

      {/* ยืนยันปิดยอด */}
      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title={`ปิดยอดโบนัส ${thaiMonthLabel(bonusMonth)}`}
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setConfirmClose(false)}>ยกเลิก</button>
            <button className="btn-primary flex-1" onClick={doClose}><Gift className="h-4 w-4" /> จ่ายโบนัส</button>
          </>
        }
      >
        <div className="space-y-2 text-sm text-neutral-600">
          <p>จ่ายโบนัสให้ผู้ขาย <b className="text-neutral-800">{bonusList.length} ราย</b> รวม <b className="text-gold-dark">+{formatBaht(bonusTotal)} แต้ม</b> ({thaiMonthLabel(bonusMonth)})</p>
          <p className="text-xs text-neutral-400">แต้มจะเข้าบัญชีผู้ขายทันที · ทำได้ครั้งเดียวต่อเดือน (กดซ้ำไม่จ่ายซ้ำ)</p>
        </div>
      </Modal>
    </>
  );
}
