"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Modal } from "@/components/ui";
import { cabinetsWithCounts, pendingBags } from "@/lib/selectors";
import { cabinetFullCode } from "@/lib/types";
import { Box, MapPin, Plus, PackageOpen, ChevronRight, Inbox } from "lucide-react";

export default function CabinetsPage() {
  const { db, addCabinet } = useStore();
  const cabinets = cabinetsWithCounts(db);
  const pending = pendingBags(db);

  const [open, setOpen] = useState(false);
  const [franchiseId, setFranchiseId] = useState(db.franchises[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const fr = db.franchises.find((f) => f.id === franchiseId);
  const save = () => {
    addCabinet({ code, name, address, franchiseId, franchiseCode: fr?.code ?? "" });
    setCode(""); setName(""); setAddress(""); setOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">ตู้ Drop &amp; Go</h1>
          <p className="text-sm text-neutral-500">{cabinets.length} ตู้ · {pending.length} ถุงรอคัดแยก</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary !px-4 !py-2.5 text-sm">
          <Plus className="h-4 w-4" /> เพิ่มตู้
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cabinets.map((c) => (
          <Link key={c.id} href={`/shop/cabinets/${c.id}`} className="card-tap flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <Box className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-neutral-800">{c.name}</p>
                <p className="font-mono text-xs font-semibold text-brand-700">{cabinetFullCode(c.franchiseCode, c.code)}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-neutral-300" />
            </div>
            <p className="flex items-center gap-1 text-xs text-neutral-500">
              <MapPin className="h-3.5 w-3.5" /> {c.location.address}
            </p>
            <div className="flex gap-2">
              <span className={`chip ${c.pending > 0 ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-500"}`}>
                <PackageOpen className="h-3.5 w-3.5" /> {c.pending} รอคัดแยก
              </span>
              <span className="chip bg-neutral-100 text-neutral-500">{c.total} ถุงรวม</span>
            </div>
          </Link>
        ))}
        {cabinets.length === 0 && (
          <div className="card col-span-full flex flex-col items-center gap-2 py-12 text-center text-neutral-400">
            <Inbox className="h-8 w-8" /> ยังไม่มีตู้ — กด “เพิ่มตู้”
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="เพิ่มตู้ Drop & Go"
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setOpen(false)}>ยกเลิก</button>
            <button className="btn-primary flex-1" disabled={!code.trim()} onClick={save}>บันทึก</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">แฟรนไชส์</label>
            <select className="input" value={franchiseId} onChange={(e) => setFranchiseId(e.target.value)}>
              {db.franchises.map((f) => (
                <option key={f.id} value={f.id}>{f.code} · {f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">รหัสตู้ (เช่น AC)</label>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-neutral-100 px-2.5 py-2 font-mono text-sm font-semibold text-neutral-500">{fr?.code ?? "??"}-</span>
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
          <p className="text-xs text-neutral-400">QR ถุงจะเป็น <span className="font-mono">{fr?.code ?? "??"}-{code.trim().toUpperCase() || "AC"}-0000001</span></p>
        </div>
      </Modal>
    </div>
  );
}
