"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { fileToDataUrl } from "@/lib/image";
import type { PayoutStatus } from "@/lib/types";
import { Landmark, Upload, CheckCircle2, Clock, XCircle, Pencil, Loader2 } from "lucide-react";

const STATUS_META: Record<PayoutStatus, { label: string; cls: string; icon: React.ElementType }> = {
  none: { label: "ยังไม่ได้เพิ่มบัญชี", cls: "bg-neutral-100 text-neutral-500", icon: Landmark },
  pending: { label: "รอบริษัทอนุมัติ", cls: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "อนุมัติแล้ว", cls: "bg-brand-100 text-brand-700", icon: CheckCircle2 },
  rejected: { label: "ถูกปฏิเสธ", cls: "bg-red-100 text-red-600", icon: XCircle },
};

export function PayoutCard() {
  const { currentUser, submitPayout } = useStore();
  const p = currentUser?.payout;
  const status: PayoutStatus = p?.status ?? "none";
  const meta = STATUS_META[status];

  const [editing, setEditing] = useState(status === "none");
  const [bankName, setBankName] = useState(p?.bankName ?? "");
  const [accountNo, setAccountNo] = useState(p?.accountNo ?? "");
  const [accountName, setAccountName] = useState(p?.accountName ?? currentUser?.name ?? "");
  const [image, setImage] = useState<string | undefined>(p?.bookBankImage);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      setImage(await fileToDataUrl(f));
    } catch {
      setErr("อ่านรูปไม่สำเร็จ ลองใหม่");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    setErr("");
    if (!bankName.trim() || !accountNo.trim() || !accountName.trim()) return setErr("กรอกธนาคาร เลขบัญชี และชื่อบัญชีให้ครบ");
    if (!image) return setErr("แนบสำเนาหน้า book bank เพื่อยืนยัน");
    submitPayout({ bankName, accountNo, accountName, bookBankImage: image });
    setEditing(false);
  };

  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Landmark className="h-5 w-5" /></span>
        <div className="flex-1">
          <p className="font-bold text-neutral-800">บัญชีรับเงินโอน</p>
          <p className="text-xs text-neutral-400">บริษัทต้องอนุมัติก่อนจึงจะทำธุรกรรมได้</p>
        </div>
        <span className={`chip ${meta.cls}`}><meta.icon className="h-3.5 w-3.5" /> {meta.label}</span>
      </div>

      {status === "rejected" && p?.note && !editing && (
        <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-100">เหตุผล: {p.note}</p>
      )}
      {status === "approved" && (
        <p className="mb-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-700 ring-1 ring-brand-100">พร้อมรับเงินโอนจากบริษัทแล้ว</p>
      )}

      {!editing && p ? (
        <>
          <div className="space-y-1 rounded-xl bg-neutral-50 p-3 text-sm">
            <Row label="ธนาคาร" value={p.bankName} />
            <Row label="เลขบัญชี" value={p.accountNo} />
            <Row label="ชื่อบัญชี" value={p.accountName} />
          </div>
          {p.bookBankImage && <img src={p.bookBankImage} alt="book bank" className="mt-2 max-h-40 w-full rounded-xl object-cover ring-1 ring-neutral-100" />}
          <button onClick={() => setEditing(true)} className="btn-outline mt-3 w-full"><Pencil className="h-4 w-4" /> แก้ไขบัญชี</button>
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="label">ธนาคาร</label>
            <input className="input" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="เช่น กสิกรไทย" />
          </div>
          <div>
            <label className="label">เลขที่บัญชี</label>
            <input className="input" inputMode="numeric" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} placeholder="xxx-x-xxxxx-x" />
          </div>
          <div>
            <label className="label">ชื่อบัญชี</label>
            <input className="input" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="ชื่อ-นามสกุล ตามบัญชี" />
          </div>
          <div>
            <label className="label">สำเนาหน้า book bank</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
            {image ? (
              <div className="relative">
                <img src={image} alt="book bank" className="max-h-44 w-full rounded-xl object-cover ring-1 ring-neutral-100" />
                <button onClick={() => fileRef.current?.click()} className="absolute bottom-2 right-2 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-700 shadow">เปลี่ยนรูป</button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-neutral-200 py-6 text-neutral-400 hover:border-brand-300 hover:text-brand-600">
                {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                <span className="text-sm">แตะเพื่ออัปโหลดรูป</span>
              </button>
            )}
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="flex gap-2">
            {p && <button onClick={() => setEditing(false)} className="btn-outline flex-1">ยกเลิก</button>}
            <button onClick={save} disabled={busy} className="btn-primary flex-1">ส่งให้บริษัทตรวจสอบ</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-semibold text-neutral-800">{value}</span>
    </div>
  );
}
