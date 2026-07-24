"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { dropGoSummary, recentCreditedBags, pendingRedemptions } from "@/lib/selectors";
import { sellerBonuses, isMonthBonusClosed } from "@/lib/rewards";
import { formatBaht, thaiDateTime, thaiMonthLabel } from "@/lib/utils";
import { POINTS_PER_BAHT, cabinetFullCode } from "@/lib/types";
import { CabinetMap, type CabinetPin } from "@/components/CabinetMap";
import { Modal } from "@/components/ui";
import { MissionsEditor } from "@/components/MissionsEditor";
import { hasGeo } from "@/lib/geo";
import { Box, PackageOpen, Coins, Banknote, Recycle, Trophy, Clock, PackageCheck, MapPin, Sparkles, CheckCircle2, Gift } from "lucide-react";

// เดือนล่าสุด 3 เดือน (YYYY-MM) สำหรับปิดยอด
const recentMonths = () => {
  const now = new Date();
  return [0, 1, 2].map((i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
};

export default function AdminDropGoPage() {
  const { db, closeMonthlyBonus } = useStore();
  const s = dropGoSummary(db);
  const recent = recentCreditedBags(db, 8);

  // ปิดยอดโบนัสประจำเดือน
  const months = recentMonths();
  const [bonusMonth, setBonusMonth] = useState(months[0]);
  const [confirmClose, setConfirmClose] = useState(false);
  const bonusList = sellerBonuses(db, bonusMonth);
  const bonusTotal = bonusList.reduce((a, b) => a + b.bonus, 0);
  const bonusClosed = isMonthBonusClosed(db, bonusMonth);
  const doClose = () => { closeMonthlyBonus(bonusMonth); setConfirmClose(false); };
  const pendingRedeem = pendingRedemptions(db);
  const pendingCabs = s.cabinets.filter((c) => c.pending > 0); // เฉพาะตู้ที่มีถุงรอคัดแยก
  const maxCab = Math.max(1, ...pendingCabs.map((c) => c.pending));

  // หมุดตู้บนแผนที่ — เฉพาะตู้ที่ปักหมุดแล้ว (ตู้ 0,0 = ยังไม่ตั้งพิกัด ข้ามไป ไม่ให้แผนที่ไปกลางทะเล)
  // ตัวเลข = ถุงที่หย่อนแล้วรอเก็บไปคัดแยก (อยู่ที่ตู้ตอนนี้)
  const pins: CabinetPin[] = s.cabinets
    .filter((c) => hasGeo(c.location.lat, c.location.lng))
    .map((c) => ({
      id: c.id,
      lat: c.location.lat,
      lng: c.location.lng,
      name: c.name,
      code: cabinetFullCode(c.franchiseCode, c.code),
      address: c.location.address,
      badge: c.dropped,
      badgeLabel: c.dropped > 0 ? `${c.dropped} ถุงรอเก็บ` : "ไม่มีถุงค้าง",
    }));
  const noGeoCount = s.cabinets.filter((c) => !hasGeo(c.location.lat, c.location.lng)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">ภาพรวม Drop &amp; Go</h1>
        <p className="text-sm text-neutral-500">ตู้ · ถุงตาข่าย · คะแนน · การแลกเงิน</p>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat icon={<Box className="h-5 w-5" />} label="ตู้ทั้งหมด" value={`${s.cabinetCount}`} sub={`${s.bagCount} ถุงสะสม`} tone="brand" />
        <Stat icon={<PackageOpen className="h-5 w-5" />} label="ถุงรอคัดแยก" value={`${s.pendingBags}`} tone={s.pendingBags > 0 ? "amber" : undefined} />
        <Stat icon={<PackageCheck className="h-5 w-5" />} label="ถุงคัดแยกแล้ว" value={`${s.creditedBags}`} sub="ให้คะแนนแล้ว" tone="brand" />
        <Stat icon={<Coins className="h-5 w-5" />} label="คะแนนจ่ายรวม" value={formatBaht(s.pointsIssued)} sub={`คงเหลือในระบบ ${formatBaht(s.pointsOutstanding)}`} tone="gold" />
        <Stat icon={<Banknote className="h-5 w-5" />} label="จ่ายเงินแลกแล้ว" value={`฿${formatBaht(s.redeemPaidBaht)}`} sub={`รอโอน ${s.redeemPending} · ฿${formatBaht(s.redeemPendingBaht)}`} tone={s.redeemPending > 0 ? "amber" : "brand"} />
      </div>

      {/* แผนที่ตู้ทั้งหมด */}
      <div className="card">
        <h2 className="mb-3 flex items-center gap-1.5 font-bold text-neutral-800"><MapPin className="h-4 w-4 text-brand-600" /> แผนที่ตู้ทั้งหมด ({s.cabinetCount} ตู้)</h2>
        {pins.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-neutral-50 py-14 text-center text-sm text-neutral-400 ring-1 ring-neutral-100">
            <MapPin className="h-7 w-7" /> ยังไม่มีตู้ที่ปักหมุด · ไปที่ <b className="text-neutral-500">แฟรนไชส์ → ตู้ &amp; QR → ปักหมุด</b> เพื่อตั้งตำแหน่ง
          </div>
        ) : (
          <CabinetMap pins={pins} height={400} />
        )}
        <p className="mt-2 text-xs text-neutral-400">ตัวเลขบนหมุด = ถุงที่หย่อนแล้วรอเก็บไปคัดแยก (อยู่ที่ตู้ตอนนี้) · <span className="font-semibold text-amber-600">หมุดส้ม = มีถุงรอเก็บ</span> · <span className="font-semibold text-red-600">หมุดแดง = ว่าง (0)</span> · แตะหมุดเพื่อดูรายละเอียด/นำทาง{noGeoCount > 0 && <span className="text-amber-600"> · มี {noGeoCount} ตู้ยังไม่ปักหมุด (ตั้งที่หน้าแฟรนไชส์)</span>}</p>
      </div>

      {/* ปิดยอดโบนัสประจำเดือน (รางวัลได้แน่นอน — จ่ายทีเดียวสิ้นเดือน) */}
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

      {/* บริษัทตั้งภารกิจ (กิจกรรม + แต้ม) เอง */}
      <MissionsEditor />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* cabinets */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-1.5 font-bold text-neutral-800"><Box className="h-4 w-4 text-brand-600" /> ตู้ที่มีถุงรอคัดแยก (เรียงจากมากสุด)</h2>
          {pendingCabs.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">ไม่มีตู้ที่มีถุงรอคัดแยก 👍</p>
          ) : (
            <div className="space-y-3.5">
              {pendingCabs.map((c) => {
                const area = [c.subdistrict, c.district, c.province].filter(Boolean).join(" · ");
                return (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800">
                        {c.name} <span className="font-mono text-[11px] font-normal text-brand-700">{cabinetFullCode(c.franchiseCode, c.code)}</span>
                      </p>
                      <span className="chip shrink-0 bg-amber-100 text-amber-700">{c.pending} รอ</span>
                    </div>
                    {area && <p className="truncate text-xs text-neutral-400">{area}</p>}
                    <div className="h-5 overflow-hidden rounded-full bg-neutral-100">
                      <div className="flex h-full items-center justify-end rounded-full bg-amber-500 px-2 text-[11px] font-bold text-white" style={{ width: `${Math.max(12, (c.pending / maxCab) * 100)}%` }}>
                        {c.pending}
                      </div>
                    </div>
                  </div>
                );
              })}
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
