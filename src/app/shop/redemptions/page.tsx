"use client";

import { useStore } from "@/lib/store";
import { pendingRedemptions } from "@/lib/selectors";
import { formatBaht, thaiDateTime } from "@/lib/utils";
import { Banknote, Check, X, Clock, CheckCircle2, XCircle, Coins } from "lucide-react";
import type { Redemption } from "@/lib/types";

export default function RedemptionsPage() {
  const { db, markRedemptionPaid, rejectRedemption } = useStore();
  const pending = pendingRedemptions(db);
  const history = db.redemptions
    .filter((r) => r.status !== "pending")
    .sort((a, b) => +new Date(b.requestedAt) - +new Date(a.requestedAt));
  const pendingTotal = pending.reduce((s, r) => s + r.amountBaht, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">คำขอแลกเงิน</h1>
        <p className="text-sm text-neutral-500">โอนเงินให้คนทิ้งที่แลกคะแนน · รอโอน {pending.length} รายการ (฿{formatBaht(pendingTotal)})</p>
      </div>

      {/* pending queue */}
      <div className="card !p-0">
        <div className="border-b border-neutral-100 px-4 py-3 text-sm font-bold text-neutral-800">รอโอนเงิน</div>
        {pending.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">ไม่มีคำขอค้าง 🎉</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {pending.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Banknote className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-neutral-800">{r.userName} · แลกเงิน ฿{formatBaht(r.amountBaht)}</p>
                  <p className="text-xs text-neutral-400">{r.code} · {thaiDateTime(r.requestedAt)} · <Coins className="inline h-3 w-3" /> {formatBaht(r.points)} คะแนน</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-neutral-100 px-2.5 py-1.5 font-mono text-xs text-neutral-600">พร้อมเพย์ {r.account}</span>
                  <button onClick={() => rejectRedemption(r.id)} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600">
                    <X className="h-3.5 w-3.5" /> ปฏิเสธ
                  </button>
                  <button onClick={() => markRedemptionPaid(r.id)} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white">
                    <Check className="h-3.5 w-3.5" /> โอนแล้ว
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* history */}
      {history.length > 0 && (
        <div className="card !p-0">
          <div className="border-b border-neutral-100 px-4 py-3 text-sm font-bold text-neutral-800">ประวัติ</div>
          <div className="divide-y divide-neutral-100">
            {history.map((r) => <HistRow key={r.id} r={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}

const META: Record<Redemption["status"], { label: string; cls: string; icon: React.ElementType }> = {
  pending: { label: "รอโอน", cls: "bg-amber-100 text-amber-700", icon: Clock },
  paid: { label: "โอนแล้ว", cls: "bg-brand-100 text-brand-700", icon: CheckCircle2 },
  rejected: { label: "ปฏิเสธ", cls: "bg-red-100 text-red-600", icon: XCircle },
};
function HistRow({ r }: { r: Redemption }) {
  const m = META[r.status];
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500"><Banknote className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-800">{r.userName} · ฿{formatBaht(r.amountBaht)}</p>
        <p className="text-xs text-neutral-400">{r.code} · {r.paidAt ? thaiDateTime(r.paidAt) : thaiDateTime(r.requestedAt)}</p>
      </div>
      <span className={`chip ${m.cls}`}><m.icon className="h-3.5 w-3.5" /> {m.label}</span>
    </div>
  );
}
