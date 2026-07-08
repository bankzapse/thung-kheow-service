"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Modal } from "@/components/ui";
import { franchisesWithStats } from "@/lib/selectors";
import { formatBaht, thaiDate } from "@/lib/utils";
import { Store, Plus, Box, PackageOpen, Coins, Phone, User } from "lucide-react";

export default function AdminFranchisesPage() {
  const { db, addFranchise } = useStore();
  const franchises = franchisesWithStats(db);

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");

  const save = () => {
    addFranchise({ code, name, ownerName, phone });
    setCode(""); setName(""); setOwnerName(""); setPhone(""); setOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">จัดการแฟรนไชส์</h1>
          <p className="text-sm text-neutral-500">{franchises.length} แฟรนไชส์ · รหัสตู้ = อักษรย่อแฟรนไชส์-ตู้ (เช่น GLN-AA)</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary !px-4 !py-2.5 text-sm"><Plus className="h-4 w-4" /> เพิ่มแฟรนไชส์</button>
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
            </div>
            <div className="space-y-1 text-xs text-neutral-500">
              <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {f.ownerName || "-"}</p>
              <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {f.phone || "-"}</p>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
              <span className="chip bg-neutral-100 text-neutral-600"><Box className="h-3.5 w-3.5" /> {f.cabinetCount} ตู้</span>
              <span className="chip bg-neutral-100 text-neutral-600"><PackageOpen className="h-3.5 w-3.5" /> {f.bagCount} ถุง</span>
              <span className="chip bg-brand-50 text-brand-700"><Coins className="h-3.5 w-3.5" /> {formatBaht(f.pointsIssued)} คะแนน</span>
            </div>
          </div>
        ))}
        {franchises.length === 0 && (
          <div className="card col-span-full flex flex-col items-center gap-2 py-12 text-center text-neutral-400">
            <Store className="h-8 w-8" /> ยังไม่มีแฟรนไชส์ — กด “เพิ่มแฟรนไชส์”
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="เพิ่มแฟรนไชส์"
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setOpen(false)}>ยกเลิก</button>
            <button className="btn-primary flex-1" disabled={!code.trim()} onClick={save}>บันทึก</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">อักษรย่อแฟรนไชส์ (เช่น GLN)</label>
            <input className="input uppercase" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="GLN" />
          </div>
          <div>
            <label className="label">ชื่อแฟรนไชส์</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Glean กรุงเทพเหนือ" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ชื่อเจ้าของ</label>
              <input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="คุณเอกชัย" />
            </div>
            <div>
              <label className="label">เบอร์โทร</label>
              <input className="input" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
            </div>
          </div>
          <p className="text-xs text-neutral-400">รหัสตู้จะขึ้นต้นด้วย <span className="font-mono">{code.trim().toUpperCase() || "GLN"}-</span> เช่น <span className="font-mono">{code.trim().toUpperCase() || "GLN"}-AA-0000001</span></p>
        </div>
      </Modal>
    </div>
  );
}
