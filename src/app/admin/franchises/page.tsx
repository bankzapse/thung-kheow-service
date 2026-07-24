"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Modal } from "@/components/ui";
import { AddressPicker } from "@/components/AddressPicker";
import { LocationPicker } from "@/components/LocationPicker";
import { hasGeo } from "@/lib/geo";
import { franchisesWithStats, franchiseRevenue, cabinetsWithCounts, cabinetsForFranchise, type FranchiseWithStats } from "@/lib/selectors";
import { cabinetFullCode, displayCabinetCode } from "@/lib/types";
import { isValidUsername } from "@/lib/username";
import { PROVINCES } from "@/lib/thai-address";
import { formatBaht, thaiDate } from "@/lib/utils";
import { RevenueExport } from "@/components/RevenueExport";
import { Store, Plus, Box, PackageOpen, Coins, Phone, User, Truck, Building2, Wallet, AlertTriangle, FileSignature, Printer, QrCode, MapPin, Pencil, Trash2, KeyRound, Search, X } from "lucide-react";

const NEAR_FULL = 30; // ถุงค้าง ≥ 30 = ใกล้เต็ม (เข้าเก็บ)
const FULL = 40; // ≥ 40 = เต็ม

type CabForm = { name: string; address: string; province: string; district: string; subdistrict: string };
const EMPTY_CAB: CabForm = { name: "", address: "", province: "", district: "", subdistrict: "" };

export default function AdminFranchisesPage() {
  const { db, addFranchise, addCabinet, editFranchise, removeFranchise, setCabinetLocation } = useStore();
  const allFranchises = franchisesWithStats(db);
  const nearFull = cabinetsWithCounts(db)
    .filter((c) => c.pending >= NEAR_FULL)
    .sort((a, b) => b.pending - a.pending);

  // ค้นหา (ชื่อ/เจ้าของ/เบอร์/รหัส) + กรองตามจังหวัด (จังหวัดของตู้ในแฟรนไชส์)
  const [q, setQ] = useState("");
  const [prov, setProv] = useState("");
  // 77 จังหวัดครบ (ไม่ใช่เฉพาะจังหวัดที่มีตู้แล้ว) · ทำเครื่องหมาย ● จังหวัดที่มีตู้
  const provWithCab = new Set((db.cabinets ?? []).map((c) => c.province).filter(Boolean) as string[]);
  const provincesOf = (fid: string) => new Set(db.cabinets.filter((c) => c.franchiseId === fid).map((c) => c.province).filter(Boolean));
  const ownerPhoneRaw = (fid: string) => db.users.find((u) => u.role === "franchise" && u.franchiseId === fid)?.phone || "";
  const franchises = allFranchises.filter((f) => {
    const kw = q.trim().toLowerCase();
    const matchQ = !kw || [f.name, f.ownerName, f.code, ownerPhoneRaw(f.id), f.phone].some((v) => (v ?? "").toLowerCase().includes(kw));
    const matchProv = !prov || provincesOf(f.id).has(prov);
    return matchQ && matchProv;
  });

  // รวมผ่อนค่าสัญญา/ส่วนแบ่งทั้งหมดทุกแฟรนไชส์ (ทุกเจ้า ไม่ขึ้นกับการค้นหา/กรอง)
  const totals = allFranchises.reduce(
    (acc, f) => {
      const r = franchiseRevenue(db, f.id);
      acc.contractRecovered += r.contractRecovered;
      acc.contractTotal += r.contractTotal;
      acc.companyShare += r.companyShare;
      acc.franchiseShare += r.franchiseShare;
      return acc;
    },
    { contractRecovered: 0, contractTotal: 0, companyShare: 0, franchiseShare: 0 },
  );

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // อักษรย่อแฟรนไชส์สร้างอัตโนมัติ ขึ้นต้น TH เสมอ (TH01, TH02, …) — ไม่ต้องกรอก
  const nextTh = "TH" + String(db.franchises.map((f) => Number(/^TH0*(\d+)$/.exec(f.code)?.[1] ?? 0)).reduce((a, b) => Math.max(a, b), 0) + 1).padStart(2, "0");
  // เข้าระบบด้วยชื่อผู้ใช้ (เบอร์ = ติดต่อ ไม่บังคับ) · เบอร์ถ้ากรอกต้องถูกรูปแบบ
  const phoneOk = !phone || /^0\d{8,9}$/.test(phone);
  const canSaveFr = !!name.trim() && isValidUsername(username) && password.length >= 4 && phoneOk;

  const save = () => {
    if (!canSaveFr) return;
    addFranchise({ code: nextTh, name, ownerName, username, phone, password });
    setName(""); setOwnerName(""); setUsername(""); setPhone(""); setPassword(""); setOpen(false);
  };

  // แก้ไข / ลบ แฟรนไชส์
  const [editFr, setEditFr] = useState<FranchiseWithStats | null>(null);
  const [ef, setEf] = useState({ name: "", ownerName: "", phone: "", password: "", username: "" });
  const ownerOf = (f: FranchiseWithStats) => db.users.find((u) => u.role === "franchise" && u.franchiseId === f.id);
  /** เบอร์ของแฟรนไชส์ = เบอร์บัญชีเจ้าของ (แหล่งเดียว) · ตกกลับไปใช้ตาราง franchises ถ้ายังไม่มีเจ้าของ */
  const ownerPhoneOf = (f: FranchiseWithStats) => ownerOf(f)?.phone || f.phone || "";

  const openEdit = (f: FranchiseWithStats) => {
    setEf({ name: f.name, ownerName: f.ownerName ?? "", phone: ownerPhoneOf(f), password: "", username: ownerOf(f)?.username ?? "" });
    setEditFr(f);
  };
  const efUsernameOk = !ef.username.trim() || isValidUsername(ef.username);
  const saveEdit = () => {
    if (!editFr || !efUsernameOk) return;
    editFranchise(editFr.id, { name: ef.name, ownerName: ef.ownerName, phone: ef.phone, password: ef.password || undefined, username: ef.username.trim() || undefined });
    setEditFr(null);
  };
  const [delFr, setDelFr] = useState<FranchiseWithStats | null>(null);
  const doDelete = () => { if (delFr) { removeFranchise(delFr.id); setDelFr(null); } };

  // เพิ่มตู้ (บริษัทเท่านั้น — ผูกกับสัญญาเช่าซื้อ)
  const [cabFor, setCabFor] = useState<FranchiseWithStats | null>(null);
  const [cab, setCab] = useState<CabForm>({ ...EMPTY_CAB });
  const [cabGeo, setCabGeo] = useState<{ lat: number; lng: number } | null>(null);
  const cabComplete = !!(cab.name.trim() && cab.address.trim() && cab.province && cab.district.trim() && cab.subdistrict.trim() && cabGeo);
  const nextTk = "TK-" + String(db.cabinets.map((c) => Number(/^TK0*(\d+)$/.exec(c.code)?.[1] ?? 0)).reduce((a, b) => Math.max(a, b), 0) + 1).padStart(2, "0");
  const openAddCab = (f: FranchiseWithStats) => { setCab({ ...EMPTY_CAB }); setCabGeo(null); setCabFor(f); };

  // ตั้งตำแหน่งตู้เดิมที่ยังไม่มีพิกัด (0,0)
  const [locCab, setLocCab] = useState<{ id: string; name: string; code: string; address: string; geo: { lat: number; lng: number } | null } | null>(null);
  const saveLoc = () => { if (locCab?.geo) { setCabinetLocation(locCab.id, locCab.geo.lat, locCab.geo.lng); setLocCab(null); } };

  // พิมพ์ QR ตู้ของแฟรนไชส์ (บริษัทพิมพ์ให้ได้)
  const [qrFor, setQrFor] = useState<FranchiseWithStats | null>(null);
  const qrCabinets = qrFor ? cabinetsForFranchise(db, qrFor.id) : [];
  const saveCab = () => {
    if (!cabFor || !cabComplete || !cabGeo) return;
    addCabinet({ name: cab.name, address: cab.address, province: cab.province, district: cab.district, subdistrict: cab.subdistrict, franchiseId: cabFor.id, franchiseCode: cabFor.code, lat: cabGeo.lat, lng: cabGeo.lng });
    setCabFor(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">จัดการแฟรนไชส์</h1>
          <p className="text-sm text-neutral-500">{franchises.length} แฟรนไชส์ · รหัสตู้กำหนดอัตโนมัติ (TK-01, TK-02, …)</p>
        </div>
        <div className="flex items-center gap-2">
          <RevenueExport size="md" />
          <button onClick={() => setOpen(true)} className="btn-primary !px-4 !py-2.5 text-sm"><Plus className="h-4 w-4" /> เพิ่มแฟรนไชส์</button>
        </div>
      </div>

      {/* รวมผ่อนค่าสัญญา / ส่วนแบ่งทั้งหมด */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-neutral-500"><FileSignature className="h-4 w-4 text-amber-500" /> ผ่อนค่าสัญญารวมทั้งหมด</div>
          <p className="text-2xl font-extrabold leading-tight text-neutral-800">฿{formatBaht(totals.contractRecovered)} <span className="text-sm font-medium text-neutral-400">/ ฿{formatBaht(totals.contractTotal)}</span></p>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${totals.contractTotal ? Math.min(100, Math.round((totals.contractRecovered / totals.contractTotal) * 100)) : 0}%` }} />
          </div>
        </div>
        <div className="card flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-neutral-500"><Building2 className="h-4 w-4 text-brand-600" /> บริษัทได้รวมทั้งหมด</div>
          <p className="text-2xl font-extrabold leading-tight text-neutral-800">฿{formatBaht(totals.companyShare)}</p>
          <p className="text-xs text-neutral-400">ส่วนแบ่งบริษัทจากทุกแฟรนไชส์</p>
        </div>
        <div className="card flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-neutral-500"><Wallet className="h-4 w-4 text-brand-600" /> แฟรนไชส์ได้รวมทั้งหมด</div>
          <p className="text-2xl font-extrabold leading-tight text-brand-700">฿{formatBaht(totals.franchiseShare)}</p>
          <p className="text-xs text-neutral-400">ส่วนแบ่งแฟรนไชส์จากทุกแฟรนไชส์</p>
        </div>
      </div>

      {/* ตู้ใกล้เต็ม — เข้าเก็บของ */}
      <div className="card">
        <h2 className="mb-3 flex items-center gap-1.5 font-bold text-neutral-800">
          <Truck className="h-4 w-4 text-amber-500" /> ตู้ใกล้เต็ม — เข้าเก็บของ ({nearFull.length})
        </h2>
        {nearFull.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">ยังไม่มีตู้ใกล้เต็ม 👍</p>
        ) : (
          <div className="space-y-2">
            {nearFull.map((c) => {
              const full = c.pending >= FULL;
              const area = [c.subdistrict, c.district, c.province].filter(Boolean).join(" · ");
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-100">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${full ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                    {full ? <AlertTriangle className="h-4 w-4" /> : <Box className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-800">{c.name} <span className="font-mono font-normal text-brand-700">{cabinetFullCode(c.franchiseCode, c.code)}</span></p>
                    <p className="truncate text-xs text-neutral-400">{c.location.address}{area && ` · ${area}`}</p>
                  </div>
                  <div className="w-28 shrink-0">
                    <div className="mb-0.5 flex justify-between text-[11px] text-neutral-400"><span>ถุงค้าง</span><span className="font-semibold">{c.pending}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                      <div className={`h-full rounded-full ${full ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, (c.pending / FULL) * 100)}%` }} />
                    </div>
                  </div>
                  <span className={`chip shrink-0 ${full ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>{full ? "เต็ม" : "ใกล้เต็ม"}</span>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[11px] text-neutral-400">บริษัทเข้าเก็บของเก่าจากตู้ให้แฟรนไชส์ · เกณฑ์ ≥ {NEAR_FULL} ถุง = ใกล้เต็ม, ≥ {FULL} = เต็ม</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <h2 className="flex items-center gap-1.5 font-bold text-neutral-800"><Store className="h-4 w-4 text-brand-600" /> แฟรนไชส์ทั้งหมด</h2>
        <span className="text-sm text-neutral-400">({franchises.length}{franchises.length !== allFranchises.length ? ` / ${allFranchises.length}` : ""})</span>
      </div>
      {/* ค้นหา + กรองจังหวัด */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา ชื่อ · เจ้าของ · เบอร์ · รหัส" />
          {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 hover:bg-neutral-100"><X className="h-4 w-4" /></button>}
        </div>
        <select className="input w-auto min-w-[150px]" value={prov} onChange={(e) => setProv(e.target.value)}>
          <option value="">ทุกจังหวัด</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{provWithCab.has(p) ? `● ${p}` : p}</option>)}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {franchises.map((f) => (
          <div key={f.id} className="card flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700 font-mono text-sm font-bold">{f.code}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-neutral-800">{f.name}</p>
                <p className="text-xs text-neutral-400">สร้าง {thaiDate(f.createdAt)}</p>
              </div>
              <button onClick={() => openEdit(f)} title="แก้ไข" className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => setDelFr(f)} title="ลบ" className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="space-y-1 text-xs text-neutral-500">
              <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {f.ownerName || "-"}</p>
              {/* เบอร์เดียวทั้งระบบ — อ่านจากบัญชีเจ้าของ (แหล่งเดียวกับฟอร์มแก้ไข)
                  เดิมการ์ดอ่าน f.phone (ตาราง franchises) ส่วนฟอร์มอ่านจาก profile
                  ทำให้เห็นคนละเบอร์ และกดบันทึกทีเดียวเบอร์ติดต่อโดนทับเงียบ ๆ */}
              <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {ownerPhoneOf(f) || "-"}</p>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
              <span className="chip bg-neutral-100 text-neutral-600"><Box className="h-3.5 w-3.5" /> {f.cabinetCount} ตู้</span>
              <span className="chip bg-neutral-100 text-neutral-600"><PackageOpen className="h-3.5 w-3.5" /> {f.bagCount} ถุง</span>
              <span className="chip bg-brand-50 text-brand-700"><Coins className="h-3.5 w-3.5" /> {formatBaht(f.pointsIssued)} คะแนน</span>
            </div>
            {/* เลขตู้ TK ของแฟรนไชส์ — ให้บริษัทรู้ว่าแฟรนไชส์นี้มีตู้ใดบ้าง */}
            {(() => {
              const cabs = cabinetsForFranchise(db, f.id);
              return cabs.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-neutral-400">ตู้:</span>
                  {cabs.map((c) => (
                    <span key={c.id} className="rounded-md bg-brand-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-700" title={c.name}>
                      {displayCabinetCode(c.code)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-300">ยังไม่มีตู้</p>
              );
            })()}
            {(() => {
              const rev = franchiseRevenue(db, f.id);
              return (
                <div className="space-y-1.5 border-t border-neutral-100 pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">ผ่อนค่าสัญญา</span>
                    <span className="font-semibold text-neutral-600">฿{formatBaht(rev.contractRecovered)} / ฿{formatBaht(rev.contractTotal)}{rev.phase === "active" ? " ✓" : ""}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div className={`h-full rounded-full ${rev.phase === "active" ? "bg-brand-500" : "bg-amber-500"}`} style={{ width: `${Math.round(rev.progressPct * 100)}%` }} />
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="flex items-center gap-1 text-neutral-500"><Building2 className="h-3 w-3" /> บริษัท ฿{formatBaht(rev.companyShare)}</span>
                    <span className="flex items-center gap-1 font-semibold text-brand-700"><Wallet className="h-3 w-3" /> แฟรนไชส์ ฿{formatBaht(rev.franchiseShare)}</span>
                  </div>
                </div>
              );
            })()}
            <div className="mt-1 flex gap-2">
              <button onClick={() => setQrFor(f)} className="btn-outline flex-1 !py-2 text-sm"><QrCode className="h-4 w-4" /> ตู้ & QR</button>
              <button onClick={() => openAddCab(f)} className="btn-outline flex-1 !py-2 text-sm"><Plus className="h-4 w-4" /> เพิ่มตู้</button>
            </div>
          </div>
        ))}
        {franchises.length === 0 && (
          <div className="card col-span-full flex flex-col items-center gap-2 py-12 text-center text-neutral-400">
            {allFranchises.length === 0 ? (
              <><Store className="h-8 w-8" /> ยังไม่มีแฟรนไชส์ — กด “เพิ่มแฟรนไชส์”</>
            ) : (
              <><Search className="h-8 w-8" /> ไม่พบแฟรนไชส์ที่ตรงกับเงื่อนไข{(q || prov) && <button onClick={() => { setQ(""); setProv(""); }} className="mt-1 text-sm font-semibold text-brand-600">ล้างตัวกรอง</button>}</>
            )}
          </div>
        )}
      </div>

      {/* เพิ่มแฟรนไชส์ */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="เพิ่มแฟรนไชส์"
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setOpen(false)}>ยกเลิก</button>
            <button className="btn-primary flex-1" disabled={!canSaveFr} onClick={save}>บันทึก</button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3.5 py-2.5">
            <span className="text-sm text-neutral-500">อักษรย่อแฟรนไชส์ <span className="text-xs">(สร้างอัตโนมัติ)</span></span>
            <span className="font-mono text-base font-bold text-brand-700">{nextTh}</span>
          </div>
          <div>
            <label className="label">ชื่อแฟรนไชส์</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ธุรกิจในเครือครอบครัว" />
            <p className="mt-1 text-xs text-neutral-400">เช่น ธุรกิจในเครือครอบครัว, ร้านของชำสาขา 2 เป็นต้น</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ชื่อเจ้าของ</label>
              <input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="คุณเอกชัย" />
            </div>
            <div>
              <label className="label">เบอร์ติดต่อ <span className="text-neutral-400">(ไม่บังคับ)</span></label>
              <input className="input" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="08x-xxx-xxxx" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ชื่อผู้ใช้ (เข้าระบบ) *</label>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase())} placeholder="เช่น eakchai" autoCapitalize="none" />
            </div>
            <div>
              <label className="label">รหัสผ่าน *</label>
              <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 4 ตัวอักษร" />
            </div>
          </div>
          {username && !isValidUsername(username) && <p className="text-xs text-amber-600">ชื่อผู้ใช้ต้องเป็น a–z, 0–9, จุด _ - ยาว 3–32 ตัว</p>}
          <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">สร้างบัญชีเข้าระบบให้เจ้าของแฟรนไชส์ด้วย — เข้าที่ <span className="font-mono">/login/franchise</span> ด้วย <b>ชื่อผู้ใช้ + รหัสผ่าน</b> นี้ (เบอร์ใช้สำหรับติดต่อ)</p>
          <p className="text-xs text-neutral-400">รหัสตู้ของแฟรนไชส์กำหนดอัตโนมัติเป็น <span className="font-mono">TK-01, TK-02, …</span> (บริษัทเป็นผู้เพิ่มตู้ตามสัญญาเช่าซื้อ)</p>
        </div>
      </Modal>

      {/* แก้ไขแฟรนไชส์ */}
      <Modal
        open={!!editFr}
        onClose={() => setEditFr(null)}
        title={editFr ? `แก้ไขแฟรนไชส์ ${editFr.code}` : "แก้ไขแฟรนไชส์"}
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setEditFr(null)}>ยกเลิก</button>
            <button className="btn-primary flex-1" disabled={!ef.name.trim() || !efUsernameOk || (!!ef.phone && !/^0\d{8,9}$/.test(ef.phone))} onClick={saveEdit}>บันทึก</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">ชื่อแฟรนไชส์</label>
            <input className="input" value={ef.name} onChange={(e) => setEf({ ...ef, name: e.target.value })} placeholder="เช่น ธุรกิจในเครือครอบครัว" />
          </div>
          <div>
            <label className="label">ชื่อเจ้าของ</label>
            <input className="input" value={ef.ownerName} onChange={(e) => setEf({ ...ef, ownerName: e.target.value })} placeholder="คุณ…" />
          </div>
          <div>
            <label className="label">ชื่อผู้ใช้ (เข้าระบบ)</label>
            <input className="input" value={ef.username} onChange={(e) => setEf({ ...ef, username: e.target.value.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase() })} placeholder="เช่น eakchai" autoCapitalize="none" />
            {!efUsernameOk && <p className="mt-1 text-xs text-amber-600">ชื่อผู้ใช้ต้องเป็น a–z, 0–9, จุด _ - ยาว 3–32 ตัว</p>}
          </div>
          <div>
            <label className="label">เบอร์ติดต่อ</label>
            <input className="input" inputMode="numeric" maxLength={10} value={ef.phone} onChange={(e) => setEf({ ...ef, phone: e.target.value.replace(/\D/g, "") })} placeholder="08x-xxx-xxxx" />
          </div>
          <div>
            <label className="label">รหัสผ่านใหม่ <span className="text-neutral-400">(เว้นว่าง = ไม่เปลี่ยน)</span></label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input className="input pl-9" type="text" value={ef.password} onChange={(e) => setEf({ ...ef, password: e.target.value })} placeholder="ตั้งรหัสผ่านใหม่ให้เจ้าของ (≥4 ตัว)" />
            </div>
          </div>
        </div>
      </Modal>

      {/* ยืนยันลบแฟรนไชส์ */}
      <Modal
        open={!!delFr}
        onClose={() => setDelFr(null)}
        title="ลบแฟรนไชส์"
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setDelFr(null)}>ยกเลิก</button>
            <button className="btn flex-1 bg-red-500 text-white hover:bg-red-600" onClick={doDelete}><Trash2 className="h-4 w-4" /> ลบถาวร</button>
          </>
        }
      >
        <div className="flex items-start gap-2.5 text-sm text-neutral-600">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <p>ลบแฟรนไชส์ <b className="text-neutral-800">{delFr?.name} ({delFr?.code})</b> — จะลบ <b>ตู้ทั้งหมด ({delFr?.cabinetCount} ตู้)</b> และ <b>บัญชีเข้าระบบของเจ้าของ</b> ด้วย · <span className="text-red-500">ย้อนกลับไม่ได้</span></p>
        </div>
      </Modal>

      {/* เพิ่มตู้ (บริษัทเท่านั้น) */}
      <Modal
        open={!!cabFor}
        onClose={() => setCabFor(null)}
        title={cabFor ? `เพิ่มตู้ให้แฟรนไชส์ ${cabFor.code}` : "เพิ่มตู้"}
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setCabFor(null)}>ยกเลิก</button>
            <button className="btn-primary flex-1 disabled:opacity-50" disabled={!cabComplete} onClick={saveCab}>บันทึก</button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-100">
            <FileSignature className="mr-1 inline h-3.5 w-3.5" /> ตู้ผูกกับสัญญาเช่าซื้อ — บริษัทเป็นผู้เพิ่มให้แฟรนไชส์เท่านั้น
          </div>
          <div className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700 ring-1 ring-brand-100">รหัสตู้จะถูกกำหนดอัตโนมัติเป็น <b>{nextTk}</b></div>
          <div>
            <label className="label">ชื่อจุดตั้ง</label>
            <input className="input" value={cab.name} onChange={(e) => setCab({ ...cab, name: e.target.value })} placeholder="Lotus's รามอินทรา" />
          </div>
          <div>
            <label className="label">ที่อยู่ / จุดสังเกต</label>
            <input className="input" value={cab.address} onChange={(e) => setCab({ ...cab, address: e.target.value })} placeholder="ชั้น G ทางเข้าหลัก" />
          </div>
          <AddressPicker province={cab.province} district={cab.district} subdistrict={cab.subdistrict} onChange={(v) => setCab({ ...cab, ...v })} />
          <LocationPicker
            value={cabGeo}
            onChange={(lat, lng) => setCabGeo({ lat, lng })}
            query={[cab.name, cab.address, cab.subdistrict, cab.district, cab.province].filter(Boolean).join(" ")}
          />
          {!cabComplete && <p className="text-xs text-amber-600">* กรอกให้ครบทุกช่อง (ชื่อ · ที่อยู่ · จังหวัด · อำเภอ · ตำบล) และปักหมุดตำแหน่งตู้บนแผนที่</p>}
        </div>
      </Modal>

      {/* ตู้ของแฟรนไชส์ + พิมพ์ QR */}
      <Modal
        open={!!qrFor}
        onClose={() => setQrFor(null)}
        title={qrFor ? `ตู้ของแฟรนไชส์ ${qrFor.code} (${qrCabinets.length})` : "ตู้ของแฟรนไชส์"}
        footer={<button className="btn-outline w-full" onClick={() => setQrFor(null)}>ปิด</button>}
      >
        {qrCabinets.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">แฟรนไชส์นี้ยังไม่มีตู้ — กด “เพิ่มตู้”</p>
        ) : (
          <div className="space-y-2">
            {qrCabinets.map((c) => {
              const area = [c.subdistrict, c.district, c.province].filter(Boolean).join(" · ");
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-100">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700"><Box className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-800">{c.name} <span className="whitespace-nowrap font-mono font-normal text-brand-700">{displayCabinetCode(c.code)}</span></p>
                    <p className="flex items-start gap-1 text-xs text-neutral-400"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /> <span>{c.location.address}{area && ` · ${area}`}</span></p>
                    {!hasGeo(c.location.lat, c.location.lng) && <p className="mt-0.5 text-[11px] font-medium text-amber-600">⚠ ยังไม่ปักหมุด — ไม่ขึ้นบนแผนที่</p>}
                  </div>
                  <button
                    onClick={() => setLocCab({ id: c.id, name: c.name, code: displayCabinetCode(c.code), address: [c.name, c.location.address, c.subdistrict, c.district, c.province].filter(Boolean).join(" "), geo: hasGeo(c.location.lat, c.location.lng) ? { lat: c.location.lat, lng: c.location.lng } : null })}
                    className={`shrink-0 rounded-lg px-2.5 py-2 text-xs font-semibold ${hasGeo(c.location.lat, c.location.lng) ? "bg-neutral-100 text-neutral-500" : "bg-amber-100 text-amber-700"}`}
                    title="ตั้งตำแหน่งบนแผนที่"
                  >
                    <MapPin className="inline h-3.5 w-3.5" /> {hasGeo(c.location.lat, c.location.lng) ? "" : "ปักหมุด"}
                  </button>
                  <Link href={`/admin/cabinets/${c.id}/qr`} className="btn-primary shrink-0 !px-3 !py-2 text-xs"><Printer className="h-3.5 w-3.5" /> พิมพ์ QR</Link>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* ตั้งตำแหน่งตู้บนแผนที่ */}
      <Modal
        open={!!locCab}
        onClose={() => setLocCab(null)}
        title={locCab ? `ตั้งตำแหน่ง ${locCab.code}` : "ตั้งตำแหน่งตู้"}
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setLocCab(null)}>ยกเลิก</button>
            <button className="btn-primary flex-1 disabled:opacity-50" disabled={!locCab?.geo} onClick={saveLoc}>บันทึกตำแหน่ง</button>
          </>
        }
      >
        {locCab && (
          <div className="space-y-2">
            <p className="text-sm text-neutral-600">{locCab.name}</p>
            <LocationPicker value={locCab.geo} onChange={(lat, lng) => setLocCab((s) => (s ? { ...s, geo: { lat, lng } } : s))} query={locCab.address} />
          </div>
        )}
      </Modal>
    </div>
  );
}
