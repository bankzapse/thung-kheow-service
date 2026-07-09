"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Modal } from "@/components/ui";
import { AddressPicker } from "@/components/AddressPicker";
import type { User as UserT } from "@/lib/types";
import { Store, Plus, Phone, Ban, CheckCircle2, KeyRound, User, MapPin, Pencil, Trash2 } from "lucide-react";

export default function AdminCentersPage() {
  const { db, addCenter, updateCenter, removeCenter, setUserStatus } = useStore();
  const centers = useMemo(() => db.users.filter((u) => u.role === "buyer"), [db.users]);

  const [mode, setMode] = useState<"add" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [addr, setAddr] = useState({ province: "", district: "", subdistrict: "" });
  const [delTarget, setDelTarget] = useState<UserT | null>(null);

  const nameOk = !!name.trim();
  const phoneOk = /^0\d{8,9}$/.test(phone.trim());
  const valid = mode === "add"
    ? nameOk && phoneOk && password.length >= 4 && !!(address.trim() && addr.province && addr.district && addr.subdistrict)
    : nameOk && phoneOk; // แก้ไข: ชื่อ+เบอร์พอ (ที่อยู่แก้ได้ตามต้องการ)

  const reset = () => { setName(""); setPhone(""); setPassword(""); setAddress(""); setAddr({ province: "", district: "", subdistrict: "" }); };
  const openAdd = () => { reset(); setEditId(null); setMode("add"); };
  const openEdit = (c: UserT) => {
    setName(c.name); setPhone(c.phone); setPassword(""); setAddress(c.address ?? "");
    setAddr({ province: c.province ?? "", district: c.district ?? "", subdistrict: c.subdistrict ?? "" });
    setEditId(c.id); setMode("edit");
  };
  const close = () => { setMode(null); setEditId(null); };

  const save = () => {
    if (!valid) return;
    if (mode === "add") {
      addCenter({ name, phone, password, address, province: addr.province, district: addr.district, subdistrict: addr.subdistrict });
    } else if (editId) {
      updateCenter(editId, { name, phone, address, province: addr.province, district: addr.district, subdistrict: addr.subdistrict });
    }
    reset(); close();
  };

  const confirmDelete = () => {
    if (delTarget) removeCenter(delTarget.id);
    setDelTarget(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">ศูนย์คัดแยก</h1>
          <p className="text-sm text-neutral-500">{centers.length} ศูนย์ · บริษัทตั้งชื่อ + รหัสผ่านให้ (ไม่ต้องสมัครเอง)</p>
        </div>
        <button onClick={openAdd} className="btn-primary !px-4 !py-2.5 text-sm"><Plus className="h-4 w-4" /> เพิ่มศูนย์คัดแยก</button>
      </div>

      {centers.length === 0 ? (
        <div className="card py-14 text-center text-neutral-400"><Store className="mx-auto mb-2 h-8 w-8" /> ยังไม่มีศูนย์คัดแยก</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {centers.map((c) => {
            const suspended = c.status === "suspended";
            const area = [c.subdistrict, c.district, c.province].filter(Boolean).join(" · ");
            return (
              <div key={c.id} className="card flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Store className="h-6 w-6" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-neutral-800">{c.name}</p>
                    <p className="flex items-center gap-1 text-xs text-neutral-400"><Phone className="h-3 w-3" /> {c.phone}</p>
                  </div>
                  <span className={`chip ${suspended ? "bg-red-100 text-red-600" : "bg-brand-100 text-brand-700"}`}>
                    {suspended ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />} {suspended ? "ระงับ" : "ใช้งาน"}
                  </span>
                </div>
                {(c.address || area) && (
                  <div className="rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                    {c.address && <p className="flex items-start gap-1"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {c.address}</p>}
                    {area && <p className={c.address ? "ml-[18px] mt-0.5 text-neutral-400" : "flex items-center gap-1"}>{area}</p>}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => openEdit(c)} className="btn-outline flex-1 !py-2 text-sm"><Pencil className="h-4 w-4" /> แก้ไข</button>
                  <button
                    onClick={() => setUserStatus(c.id, suspended ? "active" : "suspended")}
                    className={`btn-outline flex-1 !py-2 text-sm ${suspended ? "!text-brand-700" : "!text-amber-600"}`}
                  >
                    {suspended ? <><CheckCircle2 className="h-4 w-4" /> เปิดใช้</> : <><Ban className="h-4 w-4" /> ระงับ</>}
                  </button>
                  <button onClick={() => setDelTarget(c)} className="btn-outline !px-3 !py-2 !text-red-600" aria-label="ลบ"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* เพิ่ม / แก้ไข ศูนย์คัดแยก */}
      <Modal
        open={mode !== null}
        onClose={close}
        title={mode === "edit" ? "แก้ไขศูนย์คัดแยก" : "เพิ่มศูนย์คัดแยก"}
        footer={
          <>
            <button className="btn-outline flex-1" onClick={close}>ยกเลิก</button>
            <button className="btn-primary flex-1 disabled:opacity-50" disabled={!valid} onClick={save}>{mode === "edit" ? "บันทึกการแก้ไข" : "สร้างบัญชี"}</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">ชื่อศูนย์คัดแยก</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input className="input pl-9" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ศูนย์คัดแยกลาดพร้าว" />
            </div>
          </div>
          <div>
            <label className="label">เบอร์โทร (ใช้เข้าสู่ระบบ)</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input className="input pl-9" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="08x-xxx-xxxx" />
            </div>
          </div>
          {mode === "add" && (
            <div>
              <label className="label">รหัสผ่าน (บริษัทตั้งให้)</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input className="input pl-9" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 4 ตัวอักษร" />
              </div>
            </div>
          )}
          <div>
            <label className="label">ที่อยู่ / จุดสังเกต</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input className="input pl-9" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="เช่น 123 ถ.ลาดพร้าว ใกล้ MRT" />
            </div>
          </div>
          <AddressPicker province={addr.province} district={addr.district} subdistrict={addr.subdistrict} onChange={setAddr} />
          {mode === "add" && <p className="rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-500">ศูนย์คัดแยกเข้าสู่ระบบที่ <span className="font-mono text-brand-700">/login/center</span> ด้วยเบอร์ + รหัสผ่านนี้</p>}
        </div>
      </Modal>

      {/* ยืนยันการลบ */}
      <Modal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        title="ลบศูนย์คัดแยก"
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setDelTarget(null)}>ยกเลิก</button>
            <button className="btn-primary flex-1 !bg-red-600 hover:!bg-red-700" onClick={confirmDelete}>ลบถาวร</button>
          </>
        }
      >
        <p className="text-sm text-neutral-600">ต้องการลบศูนย์คัดแยก <b className="text-neutral-800">{delTarget?.name}</b> ใช่หรือไม่? บัญชีนี้จะเข้าสู่ระบบไม่ได้อีก</p>
      </Modal>
    </div>
  );
}
