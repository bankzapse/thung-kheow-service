"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Modal } from "@/components/ui";
import { franchiseById, franchiseSummary, cabinetsForFranchise } from "@/lib/selectors";
import { cabinetFullCode } from "@/lib/types";
import { formatBaht } from "@/lib/utils";
import { Box, PackageOpen, Coins, Wallet, Users, Plus, MapPin, QrCode, Printer, Store } from "lucide-react";

export default function FranchiseDashboard() {
  const { db, currentUser, addCabinet } = useStore();
  const u = currentUser!;
  const fr = franchiseById(db, u.franchiseId ?? "");
  const s = franchiseSummary(db, u.franchiseId ?? "");
  const cabinets = cabinetsForFranchise(db, u.franchiseId ?? "");

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  if (!fr) return <p className="py-16 text-center text-neutral-400">ไม่พบข้อมูลแฟรนไชส์</p>;

  const save = () => {
    addCabinet({ code, name, address, franchiseId: fr.id, franchiseCode: fr.code });
    setCode(""); setName(""); setAddress(""); setOpen(false);
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
        <button onClick={() => setOpen(true)} className="btn-primary !px-4 !py-2.5 text-sm"><Plus className="h-4 w-4" /> เพิ่มตู้</button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat icon={<Box className="h-5 w-5" />} label="ตู้ในแฟรนไชส์" value={`${s.cabinetCount}`} tone="brand" />
        <Stat icon={<PackageOpen className="h-5 w-5" />} label="ถุงรอคัดแยก" value={`${s.pendingBags}`} sub={`ให้คะแนนแล้ว ${s.creditedBags}`} tone={s.pendingBags > 0 ? "amber" : undefined} />
        <Stat icon={<Coins className="h-5 w-5" />} label="คะแนนจ่ายรวม" value={formatBaht(s.pointsIssued)} tone="gold" />
        <Stat icon={<Wallet className="h-5 w-5" />} label="มูลค่ารีไซเคิล" value={`฿${formatBaht(s.valueTotal)}`} />
        <Stat icon={<Users className="h-5 w-5" />} label="ผู้ทิ้งขยะ" value={`${s.dropperCount}`} sub="คน" />
      </div>

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
                <p className="flex items-center gap-1 text-xs text-neutral-500"><MapPin className="h-3.5 w-3.5" /> {c.location.address}</p>
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
            <label className="label">ที่อยู่</label>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ชั้น G ทางเข้าหลัก" />
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
