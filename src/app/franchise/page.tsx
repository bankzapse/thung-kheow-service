"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Modal } from "@/components/ui";
import { franchiseById, franchiseSummary, cabinetsForFranchise, franchiseRevenue } from "@/lib/selectors";
import { cabinetFullCode } from "@/lib/types";
import { CONTRACT_PER_CABINET } from "@/lib/revenue";
import { formatBaht } from "@/lib/utils";
import { RevenueExport } from "@/components/RevenueExport";
import { PayoutCard } from "@/components/PayoutCard";
import { Box, PackageOpen, Coins, Wallet, Users, Plus, MapPin, QrCode, Printer, Store, FileText, Building2, CheckCircle2 } from "lucide-react";

export default function FranchiseDashboard() {
  const { db, currentUser, addCabinet } = useStore();
  const u = currentUser!;
  const fr = franchiseById(db, u.franchiseId ?? "");
  const s = franchiseSummary(db, u.franchiseId ?? "");
  const cabinets = cabinetsForFranchise(db, u.franchiseId ?? "");
  const rev = franchiseRevenue(db, u.franchiseId ?? "");

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [subdistrict, setSubdistrict] = useState("");

  if (!fr) return <p className="py-16 text-center text-neutral-400">ไม่พบข้อมูลแฟรนไชส์</p>;

  const save = () => {
    addCabinet({ code, name, address, province, district, subdistrict, franchiseId: fr.id, franchiseCode: fr.code });
    setCode(""); setName(""); setAddress(""); setProvince(""); setDistrict(""); setSubdistrict(""); setOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">แดชบอร์ดแฟรนไชส์</h1>
          <p className="text-sm text-neutral-500">
            <span className="font-mono font-semibold text-brand-700">{fr.code}</span> · {fr.name} · เจ้าของ {fr.ownerName} ({fr.phone})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RevenueExport franchiseId={fr.id} size="md" />
          <button onClick={() => setOpen(true)} className="btn-primary !px-4 !py-2.5 text-sm"><Plus className="h-4 w-4" /> เพิ่มตู้</button>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat icon={<Box className="h-5 w-5" />} label="ตู้ในแฟรนไชส์" value={`${s.cabinetCount}`} tone="brand" />
        <Stat icon={<PackageOpen className="h-5 w-5" />} label="ถุงรอคัดแยก" value={`${s.pendingBags}`} sub={`ให้คะแนนแล้ว ${s.creditedBags}`} tone={s.pendingBags > 0 ? "amber" : undefined} />
        <Stat icon={<Coins className="h-5 w-5" />} label="คะแนนจ่ายรวม" value={formatBaht(s.pointsIssued)} tone="gold" />
        <Stat icon={<Wallet className="h-5 w-5" />} label="มูลค่ารีไซเคิล" value={`฿${formatBaht(s.valueTotal)}`} />
        <Stat icon={<Users className="h-5 w-5" />} label="ผู้ทิ้งขยะ" value={`${s.dropperCount}`} sub="คน" />
      </div>

      {/* revenue & contract */}
      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 font-bold text-neutral-800"><FileText className="h-4 w-4 text-brand-600" /> รายได้ & สัญญาตู้</h2>
          {rev.phase === "active" ? (
            <span className="chip bg-brand-100 text-brand-700"><CheckCircle2 className="h-3.5 w-3.5" /> ครบสัญญาแล้ว — คุณได้ 80%</span>
          ) : (
            <span className="chip bg-amber-100 text-amber-700">กำลังผ่อนค่าสัญญา — บริษัทหัก 80%</span>
          )}
        </div>

        {/* contract progress */}
        <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
          <span>ผ่อนค่าสัญญา (฿{formatBaht(CONTRACT_PER_CABINET)} × {rev.cabinetCount} ตู้)</span>
          <span className="font-semibold text-neutral-700">฿{formatBaht(rev.contractRecovered)} / ฿{formatBaht(rev.contractTotal)}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.round(rev.progressPct * 100)}%` }} />
        </div>
        {rev.contractRemaining > 0 && <p className="mt-1 text-xs text-neutral-400">เหลืออีก ฿{formatBaht(rev.contractRemaining)} จะครบสัญญา แล้วสัดส่วนจะกลับเป็น คุณ 80% · บริษัท 20%</p>}

        {/* shares */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-100">
            <p className="text-xs text-neutral-400">มูลค่ารีไซเคิลรวม</p>
            <p className="text-lg font-extrabold text-neutral-800">฿{formatBaht(rev.revenueTotal)}</p>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100">
            <p className="flex items-center gap-1 text-xs text-brand-700"><Wallet className="h-3.5 w-3.5" /> ส่วนแบ่งของคุณ</p>
            <p className="text-lg font-extrabold text-brand-700">฿{formatBaht(rev.franchiseShare)}</p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-100">
            <p className="flex items-center gap-1 text-xs text-neutral-400"><Building2 className="h-3.5 w-3.5" /> ส่วนแบ่งบริษัท</p>
            <p className="text-lg font-extrabold text-neutral-700">฿{formatBaht(rev.companyShare)}</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-neutral-400">ช่วงผ่อน: บริษัท 80% / คุณ 20% จนกว่าจะครบค่าสัญญา · หลังครบ: คุณ 80% / บริษัท 20% (ค่าจ้างเก็บของ + ดูแลระบบ)</p>
      </div>

      {/* บัญชีรับเงินโอน */}
      <div className="max-w-md"><PayoutCard /></div>

      {/* cabinets + codes */}
      <div>
        <h2 className="mb-3 flex items-center gap-1.5 font-bold text-neutral-800"><Box className="h-4 w-4 text-brand-600" /> รหัสตู้ของคุณ</h2>
        {cabinets.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-12 text-center text-neutral-400">
            <Store className="h-8 w-8" /> ยังไม่มีตู้ — กด “เพิ่มตู้”
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cabinets.map((c) => (
              <div key={c.id} className="card flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Box className="h-6 w-6" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-neutral-800">{c.name}</p>
                    <p className="font-mono text-sm font-semibold text-brand-700">{cabinetFullCode(c.franchiseCode, c.code)}</p>
                  </div>
                </div>
                <div className="text-xs text-neutral-500">
                  <p className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {c.location.address}</p>
                  {(c.subdistrict || c.district || c.province) && (
                    <p className="ml-5 mt-0.5 text-neutral-400">{[c.subdistrict, c.district, c.province].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`chip ${c.pending > 0 ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-500"}`}>
                    <PackageOpen className="h-3.5 w-3.5" /> {c.pending} รอคัดแยก
                  </span>
                  <span className="chip bg-neutral-100 text-neutral-500">{c.total} ถุงรวม</span>
                </div>
                <Link href={`/franchise/cabinets/${c.id}/qr`} className="btn-outline w-full !py-2 text-sm">
                  <Printer className="h-4 w-4" /> พิมพ์ QR ตู้+ถุง
                </Link>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 flex items-center gap-1 text-xs text-neutral-400">
          <QrCode className="h-3.5 w-3.5" /> QR ถุง = <span className="font-mono">{fr.code}-AA-0000001</span> (แฟรนไชส์-ตู้-ถุง) · คนทิ้งสแกนครั้งเดียวได้ทั้งตู้และถุง
        </p>
      </div>

      {/* add cabinet modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`เพิ่มตู้ในแฟรนไชส์ ${fr.code}`}
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setOpen(false)}>ยกเลิก</button>
            <button className="btn-primary flex-1" disabled={!code.trim()} onClick={save}>บันทึก</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">รหัสตู้ (เช่น AC)</label>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-neutral-100 px-2.5 py-2 font-mono text-sm font-semibold text-neutral-500">{fr.code}-</span>
              <input className="input flex-1 uppercase" maxLength={4} value={code} onChange={(e) => setCode(e.target.value)} placeholder="AC" />
            </div>
          </div>
          <div>
            <label className="label">ชื่อจุดตั้ง</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Lotus's รามอินทรา" />
          </div>
          <div>
            <label className="label">ที่อยู่ / จุดสังเกต</label>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ชั้น G ทางเข้าหลัก" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">จังหวัด</label>
              <input className="input !px-2" value={province} onChange={(e) => setProvince(e.target.value)} placeholder="กรุงเทพฯ" />
            </div>
            <div>
              <label className="label">อำเภอ/เขต</label>
              <input className="input !px-2" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="จตุจักร" />
            </div>
            <div>
              <label className="label">ตำบล/แขวง</label>
              <input className="input !px-2" value={subdistrict} onChange={(e) => setSubdistrict(e.target.value)} placeholder="จอมพล" />
            </div>
          </div>
          <p className="text-xs text-neutral-400">QR ถุงจะเป็น <span className="font-mono">{fr.code}-{code.trim().toUpperCase() || "AC"}-0000001</span></p>
        </div>
      </Modal>
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
        <p className="mt-0.5 text-2xl font-extrabold leading-tight tracking-tight text-neutral-800">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
      </div>
    </div>
  );
}
