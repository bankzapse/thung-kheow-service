"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Modal } from "@/components/ui";
import type { PayoutStatus, Role } from "@/lib/types";
import { thaiDateTime } from "@/lib/utils";
import { Landmark, CheckCircle2, XCircle, Clock, Building2, User, ExternalLink } from "lucide-react";

const STATUS: Record<PayoutStatus, { label: string; cls: string; icon: React.ElementType }> = {
  none: { label: "-", cls: "bg-neutral-100 text-neutral-500", icon: Clock },
  pending: { label: "รออนุมัติ", cls: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "อนุมัติแล้ว", cls: "bg-brand-100 text-brand-700", icon: CheckCircle2 },
  rejected: { label: "ปฏิเสธ", cls: "bg-red-100 text-red-600", icon: XCircle },
};
const ROLE_LABEL: Partial<Record<Role, string>> = { seller: "ผู้ขาย", franchise: "แฟรนไชส์" };

export default function AdminPayoutsPage() {
  const { db, reviewPayout } = useStore();
  const [zoom, setZoom] = useState<string | null>(null);
  const [reject, setReject] = useState<{ id: string; name: string } | null>(null);
  const [note, setNote] = useState("");

  const accounts = useMemo(() => {
    const rank: Record<PayoutStatus, number> = { pending: 0, rejected: 1, approved: 2, none: 3 };
    return db.users.filter((u) => u.payout).sort((a, b) => rank[a.payout!.status] - rank[b.payout!.status]);
  }, [db.users]);

  const pendingCount = accounts.filter((u) => u.payout!.status === "pending").length;

  const doReject = () => {
    if (!reject) return;
    reviewPayout(reject.id, false, note.trim() || undefined);
    setReject(null);
    setNote("");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">อนุมัติบัญชีรับเงิน</h1>
        <p className="text-sm text-neutral-500">ตรวจสำเนา book bank ของผู้ขาย & แฟรนไชส์ ก่อนอนุมัติให้ทำธุรกรรม · <span className="font-semibold text-amber-600">{pendingCount} รออนุมัติ</span></p>
      </div>

      {accounts.length === 0 ? (
        <div className="card py-14 text-center text-neutral-400"><Landmark className="mx-auto mb-2 h-8 w-8" /> ยังไม่มีบัญชีที่ส่งเข้ามา</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {accounts.map((u) => {
            const p = u.payout!;
            const s = STATUS[p.status];
            return (
              <div key={u.id} className="card">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                    {u.role === "franchise" ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-neutral-800">{u.name}</p>
                    <p className="text-xs text-neutral-400">{ROLE_LABEL[u.role] ?? u.role} · {u.phone}</p>
                  </div>
                  <span className={`chip ${s.cls}`}><s.icon className="h-3.5 w-3.5" /> {s.label}</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    {p.bookBankImage ? (
                      <button onClick={() => setZoom(p.bookBankImage!)} className="group relative block">
                        <img src={p.bookBankImage} alt="book bank" className="h-24 w-full rounded-lg object-cover ring-1 ring-neutral-200" />
                        <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 text-white/0 group-hover:bg-black/30 group-hover:text-white"><ExternalLink className="h-4 w-4" /></span>
                      </button>
                    ) : (
                      <div className="grid h-24 place-items-center rounded-lg bg-neutral-100 text-xs text-neutral-400">ไม่มีรูป</div>
                    )}
                  </div>
                  <div className="col-span-2 space-y-0.5 text-sm">
                    <p><span className="text-neutral-400">ธนาคาร:</span> <span className="font-semibold text-neutral-800">{p.bankName}</span></p>
                    <p><span className="text-neutral-400">เลขบัญชี:</span> <span className="font-mono font-semibold text-neutral-800">{p.accountNo}</span></p>
                    <p><span className="text-neutral-400">ชื่อบัญชี:</span> <span className="font-semibold text-neutral-800">{p.accountName}</span></p>
                    {p.submittedAt && <p className="text-xs text-neutral-400">ส่งเมื่อ {thaiDateTime(p.submittedAt)}</p>}
                    {p.status === "rejected" && p.note && <p className="text-xs text-red-500">เหตุผล: {p.note}</p>}
                  </div>
                </div>

                {p.status !== "approved" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setReject({ id: u.id, name: u.name })} className="btn-outline flex-1 !text-red-600"><XCircle className="h-4 w-4" /> ปฏิเสธ</button>
                    <button onClick={() => reviewPayout(u.id, true)} className="btn-primary flex-1"><CheckCircle2 className="h-4 w-4" /> อนุมัติ</button>
                  </div>
                )}
                {p.status === "approved" && (
                  <button onClick={() => setReject({ id: u.id, name: u.name })} className="btn-ghost mt-3 w-full text-sm text-neutral-400">เพิกถอนการอนุมัติ</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* zoom image */}
      <Modal open={!!zoom} onClose={() => setZoom(null)} title="สำเนาหน้า book bank">
        {zoom && <img src={zoom} alt="book bank" className="w-full rounded-xl" />}
      </Modal>

      {/* reject reason */}
      <Modal
        open={!!reject}
        onClose={() => setReject(null)}
        title={`ปฏิเสธบัญชี — ${reject?.name ?? ""}`}
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setReject(null)}>ยกเลิก</button>
            <button className="btn flex-1 bg-red-500 text-white" onClick={doReject}>ยืนยันปฏิเสธ</button>
          </>
        }
      >
        <label className="label">เหตุผล (แจ้งผู้ใช้)</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น รูป book bank ไม่ชัด / ชื่อไม่ตรง" />
      </Modal>
    </div>
  );
}
