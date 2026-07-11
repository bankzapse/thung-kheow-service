"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Modal } from "@/components/ui";
import { formatBaht } from "@/lib/utils";
import type { User } from "@/lib/types";
import { Users, Phone, Coins, Trash2, KeyRound, Search, AlertTriangle } from "lucide-react";

export default function AdminSellersPage() {
  const { db, removeSeller, resetSellerPassword } = useStore();
  const [q, setQ] = useState("");

  const sellers = useMemo(() => {
    const list = db.users.filter((u) => u.role === "seller");
    const kw = q.trim().toLowerCase();
    return list
      .filter((u) => !kw || u.name.toLowerCase().includes(kw) || (u.phone ?? "").includes(kw))
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  }, [db.users, q]);

  const [del, setDel] = useState<User | null>(null);
  const [pw, setPw] = useState<User | null>(null);
  const [newPw, setNewPw] = useState("");

  const doDelete = () => { if (del) { removeSeller(del.id); setDel(null); } };
  const doReset = () => {
    if (!pw || newPw.trim().length < 4) return;
    resetSellerPassword(pw.id, newPw.trim());
    setPw(null); setNewPw("");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-800"><Users className="h-6 w-6 text-brand-600" /> จัดการผู้ขาย</h1>
        <p className="text-sm text-neutral-500">{sellers.length} บัญชีผู้ขาย · ตั้งรหัสผ่านใหม่ (กรณีลืม) หรือลบบัญชี</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input className="input pl-9" placeholder="ค้นหาชื่อ / เบอร์โทร" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {sellers.length === 0 ? (
        <div className="card py-14 text-center text-neutral-400"><Users className="mx-auto mb-2 h-8 w-8" /> ไม่พบบัญชีผู้ขาย</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sellers.map((u) => (
            <div key={u.id} className="card flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-lg font-bold text-brand-700">{u.name.charAt(0)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-neutral-800">{u.name}</p>
                  <p className="flex items-center gap-1 text-xs text-neutral-400"><Phone className="h-3 w-3" /> {u.phone || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-neutral-50 px-3 py-2 text-sm ring-1 ring-neutral-100">
                <Coins className="h-4 w-4 text-gold-dark" /> <span className="text-neutral-500">คะแนนสะสม</span>
                <span className="ml-auto font-semibold text-neutral-800">{formatBaht(u.points ?? 0)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setNewPw(""); setPw(u); }} className="btn-outline flex-1 !py-2 text-sm"><KeyRound className="h-4 w-4" /> ตั้งรหัสใหม่</button>
                <button onClick={() => setDel(u)} className="flex items-center justify-center rounded-xl px-3 py-2 text-red-500 ring-1 ring-red-100 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ตั้งรหัสผ่านใหม่ */}
      <Modal
        open={!!pw}
        onClose={() => setPw(null)}
        title={pw ? `ตั้งรหัสผ่านใหม่ — ${pw.name}` : "ตั้งรหัสผ่านใหม่"}
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setPw(null)}>ยกเลิก</button>
            <button className="btn-primary flex-1 disabled:opacity-50" disabled={newPw.trim().length < 4} onClick={doReset}>บันทึกรหัสใหม่</button>
          </>
        }
      >
        <p className="mb-3 text-sm text-neutral-500">ตั้งรหัสผ่านใหม่ให้ผู้ขาย {pw?.phone} — แจ้งผู้ขายให้เข้าสู่ระบบด้วยรหัสนี้</p>
        <label className="label">รหัสผ่านใหม่</label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input className="input pl-9" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="อย่างน้อย 4 ตัวอักษร" onKeyDown={(e) => e.key === "Enter" && doReset()} />
        </div>
      </Modal>

      {/* ยืนยันลบ */}
      <Modal
        open={!!del}
        onClose={() => setDel(null)}
        title="ลบบัญชีผู้ขาย"
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setDel(null)}>ยกเลิก</button>
            <button className="btn flex-1 bg-red-500 text-white hover:bg-red-600" onClick={doDelete}><Trash2 className="h-4 w-4" /> ลบถาวร</button>
          </>
        }
      >
        <div className="flex items-start gap-2.5 text-sm text-neutral-600">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <p>ลบบัญชีผู้ขาย <b className="text-neutral-800">{del?.name} ({del?.phone})</b> — บัญชีเข้าระบบและข้อมูลจะถูกลบถาวร · <span className="text-red-500">ย้อนกลับไม่ได้</span></p>
        </div>
      </Modal>
    </div>
  );
}
