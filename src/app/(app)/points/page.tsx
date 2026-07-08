"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Modal, EmptyState } from "@/components/ui";
import { pointsOf, pointsLedger, redemptionsForUser } from "@/lib/selectors";
import { REDEEM_TIERS, POINTS_PER_BAHT } from "@/lib/types";
import type { PointTxn, Redemption } from "@/lib/types";
import { formatBaht, thaiDateTime } from "@/lib/utils";
import { RefreshCw, Banknote, ArrowUpCircle, ArrowDownCircle, SlidersHorizontal, Info, Clock, CheckCircle2, XCircle } from "lucide-react";

export default function PointsPage() {
  const { db, currentUser, redeemPoints } = useStore();
  const u = currentUser!;
  const points = pointsOf(db, u.id);
  const ledger = pointsLedger(db, u.id);
  const redemptions = redemptionsForUser(db, u.id);

  const [tier, setTier] = useState<(typeof REDEEM_TIERS)[number] | null>(null);
  const [account, setAccount] = useState(u.phone);
  const [tab, setTab] = useState<"redeem" | "history">("redeem");

  const doRedeem = () => {
    if (!tier) return;
    redeemPoints(tier.amountBaht, tier.points, "promptpay", account);
    setTier(null);
  };

  return (
    <div className="pb-24">
      <AppHeader title="คะแนน" subtitle="สะสม & แลกเป็นเงิน" />

      <div className="space-y-4 px-5 py-4">
        {/* balance hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-6 text-center text-white shadow-card">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <div className="relative">
            <p className="text-5xl font-extrabold tabular-nums">{formatBaht(points)}</p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-white/85">
              <RefreshCw className="h-4 w-4" /> คะแนนถุงเขียว
            </p>
            <p className="mt-2 text-xs text-white/70">≈ แลกเงินได้สูงสุด ฿{formatBaht(Math.floor(points / POINTS_PER_BAHT))}</p>
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-1 rounded-xl bg-neutral-100 p-1">
          <TabBtn active={tab === "redeem"} onClick={() => setTab("redeem")}>แลกเงินสด</TabBtn>
          <TabBtn active={tab === "history"} onClick={() => setTab("history")}>ประวัติ</TabBtn>
        </div>

        {tab === "redeem" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {REDEEM_TIERS.map((t) => {
                const enough = points >= t.points;
                return (
                  <button
                    key={t.amountBaht}
                    disabled={!enough}
                    onClick={() => { setTier(t); setAccount(u.phone); }}
                    className="card-tap flex flex-col items-start gap-1 text-left disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-card"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                      <Banknote className="h-5 w-5" />
                    </span>
                    <p className="mt-1 text-lg font-extrabold text-neutral-800">แลกเงิน ฿{formatBaht(t.amountBaht)}</p>
                    <p className={`text-xs font-medium ${enough ? "text-brand-600" : "text-neutral-400"}`}>
                      ใช้ {formatBaht(t.points)} คะแนน
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="flex items-start gap-2 rounded-2xl bg-brand-50 p-3.5 text-xs text-brand-800 ring-1 ring-brand-100">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>โอนเข้าพร้อมเพย์ภายใน 1-3 วันทำการ · อัตรา 1 คะแนน = ฿1</p>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {redemptions.length > 0 && (
              <div>
                <p className="section-title mb-2 px-1">คำขอแลกเงิน</p>
                <div className="space-y-2">
                  {redemptions.map((r) => <RedemptionRow key={r.id} r={r} />)}
                </div>
              </div>
            )}
            <div>
              <p className="section-title mb-2 px-1">ประวัติคะแนน</p>
              {ledger.length === 0 ? (
                <div className="card"><EmptyState icon="✨" title="ยังไม่มีประวัติคะแนน" /></div>
              ) : (
                <div className="card divide-y divide-neutral-100 !py-1">
                  {ledger.map((t) => <LedgerRow key={t.id} t={t} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* redeem modal */}
      <Modal
        open={!!tier}
        onClose={() => setTier(null)}
        title={`แลกเงินสด ฿${tier ? formatBaht(tier.amountBaht) : ""}`}
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setTier(null)}>ยกเลิก</button>
            <button className="btn-primary flex-1" onClick={doRedeem}>ยืนยันแลก</button>
          </>
        }
      >
        {tier && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 text-sm">
              <span className="text-neutral-500">ใช้คะแนน</span>
              <span className="font-bold text-neutral-800">{formatBaht(tier.points)} คะแนน</span>
            </div>
            <div>
              <label className="label">พร้อมเพย์ (เบอร์/บัตร ปชช.) รับเงิน</label>
              <input className="input" inputMode="numeric" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="เบอร์พร้อมเพย์" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-brand-50 p-3 text-sm ring-1 ring-brand-100">
              <span className="text-neutral-600">คะแนนคงเหลือหลังแลก</span>
              <span className="font-extrabold text-brand-700">{formatBaht(points - tier.points)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${active ? "bg-white text-brand-700 shadow-sm" : "text-neutral-500"}`}
    >
      {children}
    </button>
  );
}

const RSTATUS: Record<Redemption["status"], { label: string; cls: string; icon: React.ElementType }> = {
  pending: { label: "รอโอนเงิน", cls: "bg-amber-100 text-amber-700", icon: Clock },
  paid: { label: "โอนแล้ว", cls: "bg-brand-100 text-brand-700", icon: CheckCircle2 },
  rejected: { label: "ปฏิเสธ", cls: "bg-red-100 text-red-600", icon: XCircle },
};
function RedemptionRow({ r }: { r: Redemption }) {
  const s = RSTATUS[r.status];
  return (
    <div className="card flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500"><Banknote className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-neutral-800">แลกเงิน ฿{formatBaht(r.amountBaht)}</p>
        <p className="text-xs text-neutral-400">{r.code} · {thaiDateTime(r.requestedAt)}</p>
      </div>
      <span className={`chip ${s.cls}`}><s.icon className="h-3.5 w-3.5" /> {s.label}</span>
    </div>
  );
}

const PMETA: Record<PointTxn["type"], { icon: React.ElementType; tone: string }> = {
  earn: { icon: ArrowUpCircle, tone: "text-brand-600" },
  redeem: { icon: ArrowDownCircle, tone: "text-amber-600" },
  adjust: { icon: SlidersHorizontal, tone: "text-neutral-500" },
};
function LedgerRow({ t }: { t: PointTxn }) {
  const m = PMETA[t.type];
  const pos = t.points >= 0;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 ${m.tone}`}><m.icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-800">{t.note}</p>
        <p className="text-xs text-neutral-400">{thaiDateTime(t.date)}</p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold ${pos ? "text-brand-600" : "text-amber-600"}`}>{pos ? "+" : "−"}{formatBaht(Math.abs(t.points))}</p>
        <p className="text-[11px] text-neutral-400">คงเหลือ {formatBaht(t.balanceAfter)}</p>
      </div>
    </div>
  );
}
