"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Modal, Spinner } from "@/components/ui";
import { franchiseRevenue } from "@/lib/selectors";
import { formatBaht, thaiDateTime } from "@/lib/utils";
import type { Franchise } from "@/lib/types";
import { Banknote, CheckCircle2, XCircle, Building2, User, Clock, Landmark, AlertTriangle } from "lucide-react";

export default function AdminPaymentsPage() {
  const { db, markRedemptionPaid, rejectRedemption, payFranchise } = useStore();

  const pendingRedemptions = useMemo(() => db.redemptions.filter((r) => r.status === "pending"), [db.redemptions]);
  const paidRedemptions = useMemo(() => db.redemptions.filter((r) => r.status === "paid").slice(0, 8), [db.redemptions]);

  const [pay, setPay] = useState<{ fr: Franchise; suggested: number } | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const ownerOf = (frId: string) => db.users.find((u) => u.role === "franchise" && u.franchiseId === frId);
  const paidToFranchise = (frId: string) => (db.franchisePayouts ?? []).filter((p) => p.franchiseId === frId).reduce((s, p) => s + p.amount, 0);

  const openPay = (fr: Franchise) => {
    const rev = franchiseRevenue(db, fr.id);
    const remain = Math.max(0, Math.round(rev.franchiseShare - paidToFranchise(fr.id)));
    setPay({ fr, suggested: remain });
    setAmount(String(remain || ""));
    setNote("");
  };
  const [paying, setPaying] = useState(false);
  const confirmPay = async () => {
    if (!pay || paying) return;
    setPaying(true);
    const ok = await payFranchise(pay.fr.id, Number(amount), note);
    setPaying(false);
    if (ok) setPay(null); // ปิดเฉพาะเมื่อโอนสำเร็จ
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">โอนเงิน</h1>
        <p className="text-sm text-neutral-500">บริษัทโอนเงินให้ผู้ขาย (แลกคะแนน) และแฟรนไชส์ (ส่วนแบ่งรายได้)</p>
      </div>

      {/* ผู้ขาย: คำขอแลกเงิน */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 font-bold text-neutral-800"><User className="h-4 w-4 text-brand-600" /> ผู้ขาย — คำขอแลกเงิน ({pendingRedemptions.length})</h2>
        {pendingRedemptions.length === 0 ? (
          <div className="card text-sm text-neutral-400">ไม่มีคำขอรอโอน</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pendingRedemptions.map((r) => (
              <div key={r.id} className="card flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Banknote className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-neutral-800">฿{formatBaht(r.amountBaht)} <span className="text-xs font-normal text-neutral-400">· {r.userName}</span></p>
                  <p className="text-xs text-neutral-400">{r.code} · พร้อมเพย์ {r.account} · {thaiDateTime(r.requestedAt)}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => rejectRedemption(r.id)} className="btn-outline !px-2.5 !py-2 !text-red-600"><XCircle className="h-4 w-4" /></button>
                  <button onClick={() => markRedemptionPaid(r.id)} className="btn-primary !px-3 !py-2 text-sm"><CheckCircle2 className="h-4 w-4" /> โอนแล้ว</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {paidRedemptions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {paidRedemptions.map((r) => (
              <span key={r.id} className="chip bg-neutral-100 text-neutral-500"><CheckCircle2 className="h-3 w-3 text-brand-500" /> {r.userName} ฿{formatBaht(r.amountBaht)}</span>
            ))}
          </div>
        )}
      </section>

      {/* แฟรนไชส์: โอนส่วนแบ่ง */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 font-bold text-neutral-800"><Building2 className="h-4 w-4 text-brand-600" /> แฟรนไชส์ — โอนส่วนแบ่งรายได้</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {db.franchises.map((fr) => {
            const rev = franchiseRevenue(db, fr.id);
            const paid = paidToFranchise(fr.id);
            const remain = Math.max(0, Math.round(rev.franchiseShare - paid));
            const owner = ownerOf(fr.id);
            const approved = owner?.payout?.status === "approved";
            return (
              <div key={fr.id} className="card">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Building2 className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-neutral-800"><span className="font-mono text-brand-700">{fr.code}</span> {fr.name}</p>
                    <p className="text-xs text-neutral-400">เจ้าของ {fr.ownerName}</p>
                  </div>
                  {approved ? (
                    <span className="chip bg-brand-100 text-brand-700"><CheckCircle2 className="h-3.5 w-3.5" /> บัญชีพร้อม</span>
                  ) : (
                    <span className="chip bg-amber-100 text-amber-700"><Clock className="h-3.5 w-3.5" /> รอยืนยันบัญชี</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <Mini label="ส่วนแบ่งสะสม" value={`฿${formatBaht(rev.franchiseShare)}`} />
                  <Mini label="โอนแล้ว" value={`฿${formatBaht(paid)}`} />
                  <Mini label="ค้างโอน" value={`฿${formatBaht(remain)}`} tone={remain > 0 ? "amber" : undefined} />
                </div>
                {!approved && <p className="mt-2 flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="h-3.5 w-3.5" /> เจ้าของต้องยืนยันบัญชี + บริษัทอนุมัติก่อนจึงโอนได้</p>}
                <button onClick={() => openPay(fr)} disabled={!approved || remain <= 0} className="btn-primary mt-3 w-full disabled:opacity-50">
                  <Landmark className="h-4 w-4" /> โอนส่วนแบ่ง
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <Modal
        open={!!pay}
        onClose={() => setPay(null)}
        title={`โอนส่วนแบ่ง — ${pay?.fr.name ?? ""}`}
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setPay(null)} disabled={paying}>ยกเลิก</button>
            <button className="btn-primary flex-1" onClick={confirmPay} disabled={paying}>{paying ? <Spinner className="h-4 w-4" /> : "ยืนยันโอน"}</button>
          </>
        }
      >
        {pay && (
          <div className="space-y-3">
            {(() => {
              const owner = ownerOf(pay.fr.id);
              const p = owner?.payout;
              return p ? (
                <div className="rounded-xl bg-neutral-50 p-3 text-sm">
                  <p className="text-neutral-500">โอนเข้าบัญชี</p>
                  <p className="font-semibold text-neutral-800">{p.bankName} · {p.accountNo}</p>
                  <p className="text-xs text-neutral-400">{p.accountName}</p>
                </div>
              ) : null;
            })()}
            <div>
              <label className="label">จำนวนเงิน (บาท)</label>
              <input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
              <p className="mt-1 text-xs text-neutral-400">แนะนำ: ค้างโอน ฿{formatBaht(pay.suggested)}</p>
            </div>
            <div>
              <label className="label">หมายเหตุ (ไม่บังคับ)</label>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น รอบเดือน ก.ค." />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "amber" }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-2">
      <p className={`font-bold ${tone === "amber" ? "text-amber-600" : "text-neutral-800"}`}>{value}</p>
      <p className="text-[11px] text-neutral-400">{label}</p>
    </div>
  );
}
