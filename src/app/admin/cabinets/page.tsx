"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Modal, Segmented } from "@/components/ui";
import { AddressPicker } from "@/components/AddressPicker";
import { LocationPicker } from "@/components/LocationPicker";
import { hasGeo } from "@/lib/geo";
import { cabinetsWithCounts, type CabinetWithCounts } from "@/lib/selectors";
import { displayCabinetCode, cabinetFullCode } from "@/lib/types";
import { PROVINCES } from "@/lib/thai-address";
import { thaiDate } from "@/lib/utils";
import { Boxes, Box, Plus, Search, X, MapPin, Pencil, Trash2, Move, Store, AlertTriangle, Printer, PackageOpen, ArrowDownWideNarrow } from "lucide-react";

type CabForm = { name: string; address: string; province: string; district: string; subdistrict: string };
const EMPTY_CAB: CabForm = { name: "", address: "", province: "", district: "", subdistrict: "" };
type StatusFilter = "all" | "free" | "assigned";
type SortKey = "code" | "status" | "pending";

const areaOf = (c: { subdistrict?: string; district?: string; province?: string }) => [c.subdistrict, c.district, c.province].filter(Boolean).join(" · ");

export default function AdminCabinetsPage() {
  const { db, createCabinet, reassignCabinet, deleteCabinet, updateCabinetInfo, setCabinetLocation } = useStore();
  const codeNo = (code: string) => Number(/\d+/.exec(code)?.[0] ?? 0);
  const cabinets = useMemo(() => cabinetsWithCounts(db), [db]);
  const franchiseName = (id: string) => db.franchises.find((f) => f.id === id)?.name ?? "";

  const freeCount = cabinets.filter((c) => !c.franchiseId).length;
  const assignedCount = cabinets.length - freeCount;

  // ── ตัวกรอง: ค้นหา + จังหวัด + สถานะ ──
  const [q, setQ] = useState("");
  const [prov, setProv] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("code");
  const provWithCab = new Set((db.cabinets ?? []).map((c) => c.province).filter(Boolean) as string[]);
  const filtered = cabinets
    .filter((c) => {
      const kw = q.trim().toLowerCase();
      const isFree = !c.franchiseId;
      const matchStatus = status === "all" || (status === "free" ? isFree : !isFree);
      const matchProv = !prov || c.province === prov;
      const matchQ = !kw || [c.name, c.code, cabinetFullCode(c.franchiseCode, c.code), c.location.address, franchiseName(c.franchiseId)].some((v) => (v ?? "").toLowerCase().includes(kw));
      return matchStatus && matchProv && matchQ;
    })
    .sort((a, b) => {
      if (sortBy === "pending") return b.pending - a.pending || codeNo(a.code) - codeNo(b.code); // ถุงค้างมาก→น้อย
      if (sortBy === "status") return (a.franchiseId ? 1 : 0) - (b.franchiseId ? 1 : 0) || codeNo(a.code) - codeNo(b.code); // ว่างขึ้นก่อน
      return codeNo(a.code) - codeNo(b.code) || a.code.localeCompare(b.code); // รหัสตู้ TK-01, TK-02, …
    });

  // ── สร้างตู้ใหม่ (เข้าคลัง/มอบให้แฟรนไชส์) ──
  const [openCreate, setOpenCreate] = useState(false);
  const [cab, setCab] = useState<CabForm>({ ...EMPTY_CAB });
  const [cabGeo, setCabGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [cabFr, setCabFr] = useState(""); // "" = เข้าคลัง (ว่าง)
  const nextTk = "TK-" + String(db.cabinets.map((c) => Number(/^TK0*(\d+)$/.exec(c.code)?.[1] ?? 0)).reduce((a, b) => Math.max(a, b), 0) + 1).padStart(2, "0");
  const cabComplete = !!(cab.name.trim() && cab.address.trim() && cab.province && cab.district.trim() && cab.subdistrict.trim() && cabGeo);
  const openCreateModal = () => { setCab({ ...EMPTY_CAB }); setCabGeo(null); setCabFr(""); setOpenCreate(true); };
  const saveCreate = () => {
    if (!cabComplete || !cabGeo) return;
    const fr = db.franchises.find((f) => f.id === cabFr);
    createCabinet({ name: cab.name, address: cab.address, province: cab.province, district: cab.district, subdistrict: cab.subdistrict, franchiseId: cabFr || undefined, franchiseCode: fr?.code, lat: cabGeo.lat, lng: cabGeo.lng });
    setOpenCreate(false);
  };

  // ── ย้าย/มอบหมายตู้ ──
  const [moveCab, setMoveCab] = useState<CabinetWithCounts | null>(null);
  const [moveTo, setMoveTo] = useState(""); // franchiseId ปลายทาง ("" = ปลดเป็นว่าง)
  const openMove = (c: CabinetWithCounts) => { setMoveTo(c.franchiseId || ""); setMoveCab(c); };
  const saveMove = () => {
    if (!moveCab) return;
    const fr = db.franchises.find((f) => f.id === moveTo);
    reassignCabinet(moveCab.id, moveTo, fr?.code ?? "");
    setMoveCab(null);
  };

  // ── แก้ข้อมูลตู้ ──
  const [editCab, setEditCab] = useState<{ id: string; code: string } | null>(null);
  const [ec, setEc] = useState<CabForm>({ ...EMPTY_CAB });
  const ecComplete = !!(ec.name.trim() && ec.address.trim() && ec.province && ec.district.trim() && ec.subdistrict.trim());
  const openEditCab = (c: CabinetWithCounts) => {
    setEc({ name: c.name, address: c.location.address, province: c.province ?? "", district: c.district ?? "", subdistrict: c.subdistrict ?? "" });
    setEditCab({ id: c.id, code: displayCabinetCode(c.code) });
  };
  const saveEditCab = () => {
    if (!editCab || !ecComplete) return;
    updateCabinetInfo(editCab.id, { name: ec.name, address: ec.address, province: ec.province, district: ec.district, subdistrict: ec.subdistrict });
    setEditCab(null);
  };

  // ── ปักหมุดตำแหน่ง ──
  const [locCab, setLocCab] = useState<{ id: string; code: string; query: string; geo: { lat: number; lng: number } | null } | null>(null);
  const saveLoc = () => { if (locCab?.geo) { setCabinetLocation(locCab.id, locCab.geo.lat, locCab.geo.lng); setLocCab(null); } };

  // ── ลบตู้ ──
  const [delCab, setDelCab] = useState<CabinetWithCounts | null>(null);
  const doDelete = () => { if (delCab) { deleteCabinet(delCab.id); setDelCab(null); } };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-800"><Boxes className="h-6 w-6 text-brand-600" /> จัดการตู้ทั้งหมด</h1>
          <p className="text-sm text-neutral-500">คลังตู้ทั้งระบบ · สร้าง · มอบให้แฟรนไชส์ · ย้าย · ลบ</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary !px-4 !py-2.5 text-sm"><Plus className="h-4 w-4" /> สร้างตู้ใหม่</button>
      </div>

      {/* สรุปสถานะ */}
      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => setStatus("all")} className={`card flex flex-col gap-1 text-left transition ${status === "all" ? "ring-2 ring-brand-400" : ""}`}>
          <div className="flex items-center gap-2 text-sm text-neutral-500"><Boxes className="h-4 w-4 text-neutral-400" /> ตู้ทั้งหมด</div>
          <p className="text-2xl font-extrabold text-neutral-800">{cabinets.length}</p>
        </button>
        <button onClick={() => setStatus("free")} className={`card flex flex-col gap-1 text-left transition ${status === "free" ? "ring-2 ring-amber-400" : ""}`}>
          <div className="flex items-center gap-2 text-sm text-neutral-500"><Box className="h-4 w-4 text-amber-500" /> ว่าง (ยังไม่สังกัด)</div>
          <p className="text-2xl font-extrabold text-amber-600">{freeCount}</p>
        </button>
        <button onClick={() => setStatus("assigned")} className={`card flex flex-col gap-1 text-left transition ${status === "assigned" ? "ring-2 ring-brand-400" : ""}`}>
          <div className="flex items-center gap-2 text-sm text-neutral-500"><Store className="h-4 w-4 text-brand-600" /> ถูกใช้งาน</div>
          <p className="text-2xl font-extrabold text-brand-700">{assignedCount}</p>
        </button>
      </div>

      {/* ตัวกรอง */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา รหัสตู้ · ชื่อจุดตั้ง · ที่อยู่ · แฟรนไชส์" />
          {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 hover:bg-neutral-100"><X className="h-4 w-4" /></button>}
        </div>
        <select className="input w-auto min-w-[150px]" value={prov} onChange={(e) => setProv(e.target.value)}>
          <option value="">ทุกจังหวัด</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{provWithCab.has(p) ? `● ${p}` : p}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <ArrowDownWideNarrow className="h-4 w-4 shrink-0 text-neutral-400" />
          <select className="input w-auto min-w-[150px]" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
            <option value="code">เรียงตาม: รหัสตู้</option>
            <option value="status">เรียงตาม: สถานะ (ว่างก่อน)</option>
            <option value="pending">เรียงตาม: ถุงค้าง (มาก→น้อย)</option>
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <Segmented<StatusFilter>
            value={status}
            onChange={setStatus}
            options={[{ value: "all", label: "ทั้งหมด" }, { value: "free", label: `ว่าง (${freeCount})` }, { value: "assigned", label: `ใช้งาน (${assignedCount})` }]}
          />
        </div>
      </div>

      {/* รายการตู้ */}
      <div className="space-y-2">
        {filtered.map((c) => {
          const free = !c.franchiseId;
          const area = areaOf(c);
          const placed = hasGeo(c.location.lat, c.location.lng);
          return (
            <div key={c.id} className="card flex flex-wrap items-center gap-3 !py-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${free ? "bg-amber-100 text-amber-600" : "bg-brand-100 text-brand-700"}`}><Box className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-800">
                  {c.name} <span className="whitespace-nowrap font-mono font-normal text-brand-700">{free ? displayCabinetCode(c.code) : cabinetFullCode(c.franchiseCode, c.code)}</span>
                </p>
                <p className="flex items-start gap-1 truncate text-xs text-neutral-400"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /> <span className="truncate">{c.location.address}{area && ` · ${area}`}</span></p>
              </div>
              {/* สถานะ + แฟรนไชส์ */}
              <div className="flex shrink-0 flex-col items-end gap-1">
                {free ? (
                  <span className="chip bg-amber-100 text-amber-700">● ว่าง</span>
                ) : (
                  <span className="chip max-w-[160px] truncate bg-brand-50 text-brand-700" title={franchiseName(c.franchiseId)}><Store className="h-3.5 w-3.5" /> {franchiseName(c.franchiseId) || c.franchiseCode}</span>
                )}
                <span className="flex items-center gap-1 text-[11px] text-neutral-400"><PackageOpen className="h-3 w-3" /> {c.pending} ถุงค้าง · สร้าง {thaiDate(c.createdAt)}</span>
              </div>
              {/* ปุ่มจัดการ */}
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => openMove(c)} title="ย้าย / มอบหมาย" className="rounded-lg bg-neutral-100 p-2 text-neutral-500 hover:text-brand-600"><Move className="h-4 w-4" /></button>
                <button onClick={() => setLocCab({ id: c.id, code: displayCabinetCode(c.code), query: [c.name, c.location.address, c.subdistrict, c.district, c.province].filter(Boolean).join(" "), geo: placed ? { lat: c.location.lat, lng: c.location.lng } : null })} title="ปักหมุดตำแหน่ง" className={`rounded-lg p-2 ${placed ? "bg-neutral-100 text-neutral-500 hover:text-brand-600" : "bg-amber-100 text-amber-700"}`}><MapPin className="h-4 w-4" /></button>
                <button onClick={() => openEditCab(c)} title="แก้ข้อมูล" className="rounded-lg bg-neutral-100 p-2 text-neutral-500 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                <Link href={`/admin/cabinets/${c.id}/qr`} title="พิมพ์ QR" className="rounded-lg bg-neutral-100 p-2 text-neutral-500 hover:text-brand-600"><Printer className="h-4 w-4" /></Link>
                <button onClick={() => setDelCab(c)} title="ลบตู้" className="rounded-lg bg-neutral-100 p-2 text-neutral-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="card flex flex-col items-center gap-2 py-12 text-center text-neutral-400">
            {cabinets.length === 0 ? (
              <><Boxes className="h-8 w-8" /> ยังไม่มีตู้ — กด “สร้างตู้ใหม่”</>
            ) : (
              <><Search className="h-8 w-8" /> ไม่พบตู้ที่ตรงกับเงื่อนไข{(q || prov || status !== "all") && <button onClick={() => { setQ(""); setProv(""); setStatus("all"); }} className="mt-1 text-sm font-semibold text-brand-600">ล้างตัวกรอง</button>}</>
            )}
          </div>
        )}
      </div>

      {/* สร้างตู้ใหม่ */}
      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="สร้างตู้ใหม่"
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setOpenCreate(false)}>ยกเลิก</button>
            <button className="btn-primary flex-1 disabled:opacity-50" disabled={!cabComplete} onClick={saveCreate}>บันทึก</button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700 ring-1 ring-brand-100">รหัสตู้จะถูกกำหนดอัตโนมัติเป็น <b>{nextTk}</b></div>
          <div>
            <label className="label">มอบให้แฟรนไชส์</label>
            <select className="input" value={cabFr} onChange={(e) => setCabFr(e.target.value)}>
              <option value="">— เข้าคลัง (ตู้ว่าง มอบทีหลังได้)</option>
              {db.franchises.map((f) => <option key={f.id} value={f.id}>{f.code} · {f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">ชื่อจุดตั้ง</label>
            <input className="input" value={cab.name} onChange={(e) => setCab({ ...cab, name: e.target.value })} placeholder="Lotus's รามอินทรา" />
          </div>
          <div>
            <label className="label">ที่อยู่ / จุดสังเกต</label>
            <input className="input" value={cab.address} onChange={(e) => setCab({ ...cab, address: e.target.value })} placeholder="ชั้น G ทางเข้าหลัก" />
          </div>
          <AddressPicker province={cab.province} district={cab.district} subdistrict={cab.subdistrict} onChange={(v) => setCab({ ...cab, ...v })} />
          <LocationPicker value={cabGeo} onChange={(lat, lng) => setCabGeo({ lat, lng })} query={[cab.name, cab.address, cab.subdistrict, cab.district, cab.province].filter(Boolean).join(" ")} />
          {!cabComplete && <p className="text-xs text-amber-600">* กรอกให้ครบทุกช่อง (ชื่อ · ที่อยู่ · จังหวัด · อำเภอ · ตำบล) และปักหมุดตำแหน่งบนแผนที่</p>}
        </div>
      </Modal>

      {/* ย้าย / มอบหมายตู้ */}
      <Modal
        open={!!moveCab}
        onClose={() => setMoveCab(null)}
        title={moveCab ? `ย้าย / มอบหมายตู้ ${displayCabinetCode(moveCab.code)}` : "ย้ายตู้"}
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setMoveCab(null)}>ยกเลิก</button>
            <button className="btn-primary flex-1 disabled:opacity-50" disabled={!moveCab || moveTo === (moveCab.franchiseId || "")} onClick={saveMove}>บันทึก</button>
          </>
        }
      >
        {moveCab && (
          <div className="space-y-3">
            <div className="rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-600 ring-1 ring-neutral-100">
              <b className="text-neutral-800">{moveCab.name}</b> · ปัจจุบัน: {moveCab.franchiseId ? <span className="font-semibold text-brand-700">{franchiseName(moveCab.franchiseId) || moveCab.franchiseCode}</span> : <span className="font-semibold text-amber-600">ว่าง</span>}
            </div>
            <div>
              <label className="label">มอบหมายให้แฟรนไชส์</label>
              <select className="input" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                <option value="">— ปลดเป็นตู้ว่าง (ไม่สังกัด)</option>
                {db.franchises.map((f) => <option key={f.id} value={f.id}>{f.code} · {f.name}</option>)}
              </select>
            </div>
            <p className="text-[11px] text-neutral-400">ย้ายตู้ = เปลี่ยนแฟรนไชส์เจ้าของ · ถุง/ประวัติในตู้ยังอยู่กับตู้เดิม (ไม่หาย)</p>
          </div>
        )}
      </Modal>

      {/* แก้ข้อมูลตู้ */}
      <Modal
        open={!!editCab}
        onClose={() => setEditCab(null)}
        title={editCab ? `แก้ไขตู้ ${editCab.code}` : "แก้ไขตู้"}
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setEditCab(null)}>ยกเลิก</button>
            <button className="btn-primary flex-1 disabled:opacity-50" disabled={!ecComplete} onClick={saveEditCab}>บันทึก</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">ชื่อจุดตั้ง</label>
            <input className="input" value={ec.name} onChange={(e) => setEc({ ...ec, name: e.target.value })} placeholder="Lotus's รามอินทรา" />
          </div>
          <div>
            <label className="label">ที่อยู่ / จุดสังเกต</label>
            <input className="input" value={ec.address} onChange={(e) => setEc({ ...ec, address: e.target.value })} placeholder="ชั้น G ทางเข้าหลัก" />
          </div>
          <AddressPicker province={ec.province} district={ec.district} subdistrict={ec.subdistrict} onChange={(v) => setEc({ ...ec, ...v })} />
          {!ecComplete && <p className="text-xs text-amber-600">* กรอกให้ครบทุกช่อง (ชื่อ · ที่อยู่ · จังหวัด · อำเภอ · ตำบล)</p>}
          <p className="text-[11px] text-neutral-400">แก้พิกัดบนแผนที่ได้ที่ปุ่ม “ปักหมุด” ในรายการตู้</p>
        </div>
      </Modal>

      {/* ปักหมุดตำแหน่ง */}
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
        {locCab && <LocationPicker value={locCab.geo} onChange={(lat, lng) => setLocCab((s) => (s ? { ...s, geo: { lat, lng } } : s))} query={locCab.query} />}
      </Modal>

      {/* ยืนยันลบตู้ */}
      <Modal
        open={!!delCab}
        onClose={() => setDelCab(null)}
        title="ลบตู้"
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setDelCab(null)}>ยกเลิก</button>
            <button className="btn flex-1 bg-red-500 text-white hover:bg-red-600" onClick={doDelete}><Trash2 className="h-4 w-4" /> ลบถาวร</button>
          </>
        }
      >
        {delCab && (
          <div className="flex items-start gap-2.5 text-sm text-neutral-600">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <p>
              ลบตู้ <b className="text-neutral-800">{delCab.name} ({delCab.franchiseId ? cabinetFullCode(delCab.franchiseCode, delCab.code) : displayCabinetCode(delCab.code)})</b>
              {delCab.franchiseId && <> จากแฟรนไชส์ <b>{franchiseName(delCab.franchiseId) || delCab.franchiseCode}</b></>}
              {delCab.pending > 0 && <> · <span className="font-semibold text-amber-600">มีถุงค้าง {delCab.pending} ถุง</span> (ประวัติจะไม่ผูกกับตู้นี้อีก)</>}
              {" "}· <span className="text-red-500">ย้อนกลับไม่ได้</span>
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
