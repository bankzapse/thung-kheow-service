"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Modal } from "@/components/ui";
import { incomeSummary, jobsForSeller, jobsForBuyer } from "@/lib/selectors";
import { luckyDrawConfig, entriesForUser } from "@/lib/luckyDraw";
import { formatBaht, thaiMonthLabel, thaiDate } from "@/lib/utils";
import { realEmail } from "@/lib/username";
import { MATERIAL_MAP } from "@/lib/materials";
import {
  User,
  Phone,
  Mail,
  MessageCircle,
  LogOut,
  Ticket,
  Trophy,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  Wallet,
  Coins,
  Store,
} from "lucide-react";

export default function IncomePage() {
  const router = useRouter();
  const { db, currentUser, logout, connectLine } = useStore();
  const u = currentUser!;
  const isSeller = u.role === "seller";
  const [showLogout, setShowLogout] = useState(false);

  const doLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div>
      <AppHeader title={isSeller ? "รายได้ของฉัน" : "บัญชีของฉัน"} />

      <div className="space-y-4 px-5 pb-28 pt-4">
        {/* profile */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-2xl font-bold text-brand-700">
              {u.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-neutral-800">{u.name}</p>
              <span className="chip bg-neutral-100 text-neutral-500">{isSeller ? "ผู้ขาย" : "ผู้ซื้อ / คนขับ"}</span>
            </div>
          </div>
          <div className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 text-sm text-neutral-500">
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-neutral-400" /> {u.phone}</p>
            {realEmail(u.email) && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-neutral-400" /> {realEmail(u.email)}</p>}
          </div>
          {/* LINE connect */}
          <button
            onClick={u.lineConnected ? undefined : connectLine}
            disabled={u.lineConnected}
            className={`mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${u.lineConnected ? "bg-[#06C755]/10 text-[#06C755]" : "bg-[#06C755] text-white"}`}
          >
            <MessageCircle className="h-4 w-4" />
            {u.lineConnected ? "เชื่อม LINE OA แล้ว ✓" : "เชื่อมบัญชี LINE OA เพื่อรับแจ้งเตือน"}
          </button>
        </div>

        {isSeller ? <SellerBody userId={u.id} db={db} /> : <BuyerBody userId={u.id} db={db} />}

        {/* logout */}
        <button
          onClick={() => setShowLogout(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white py-3.5 text-sm font-semibold text-red-500 transition hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" /> ออกจากระบบ
        </button>
      </div>

      <Modal
        open={showLogout}
        onClose={() => setShowLogout(false)}
        title="ออกจากระบบ?"
        footer={
          <>
            <button className="btn-outline flex-1" onClick={() => setShowLogout(false)}>ยกเลิก</button>
            <button className="btn flex-1 bg-red-500 text-white" onClick={doLogout}>ออกจากระบบ</button>
          </>
        }
      >
        คุณต้องการออกจากระบบใช่หรือไม่?
      </Modal>
    </div>
  );
}

function SellerBody({ userId, db }: { userId: string; db: ReturnType<typeof useStore>["db"] }) {
  const income = incomeSummary(db, userId);
  const drawCfg = luckyDrawConfig(db);
  const myEntries = entriesForUser(db, userId, drawCfg);
  const completed = jobsForSeller(db, userId).filter((j) => j.status === "completed");
  const maxMonth = Math.max(1, ...income.byMonth.map((m) => m.amount));

  return (
    <>
      {/* income summary */}
      <div className="card bg-gradient-to-br from-brand-600 to-brand-700 text-white">
        <p className="flex items-center gap-1.5 text-sm text-white/80"><TrendingUp className="h-4 w-4" /> ขายได้เดือน{thaiMonthLabel(new Date().toISOString().slice(0, 7))}</p>
        <p className="mt-1 text-3xl font-extrabold">฿{formatBaht(income.thisMonth)}</p>
        <div className="mt-3 flex gap-4 border-t border-white/20 pt-3 text-sm">
          <div>
            <p className="text-white/70">รวมทั้งหมด</p>
            <p className="text-lg font-bold">฿{formatBaht(income.total)}</p>
          </div>
          <div>
            <p className="text-white/70">งานสำเร็จ</p>
            <p className="text-lg font-bold">{income.completedCount} งาน</p>
          </div>
        </div>
      </div>

      {/* monthly bars */}
      {income.byMonth.length > 0 && (
        <div className="card">
          <h3 className="mb-3 font-bold text-neutral-800">รายได้รายเดือน</h3>
          <div className="space-y-2">
            {income.byMonth.map((m) => (
              <div key={m.month} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-xs text-neutral-500">{thaiMonthLabel(m.month)}</span>
                <div className="h-5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                  <div className="flex h-full items-center justify-end rounded-full bg-brand-500 px-2 text-[10px] font-bold text-white" style={{ width: `${Math.max(18, (m.amount / maxMonth) * 100)}%` }}>
                    ฿{formatBaht(m.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* สิทธิ์ลุ้นชิงโชค (แสดงเมื่อเปิดระบบ) */}
      {drawCfg.enabled && (
        <Link href="/rewards" className="card block">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
              <Ticket className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-neutral-800">สิทธิ์ลุ้นรางวัลเดือนนี้</p>
              <p className="text-xs text-neutral-400">ทุกมูลค่า ฿{formatBaht(drawCfg.bahtPerEntry)} = 1 สิทธิ์</p>
            </div>
            <span className="text-2xl font-extrabold text-gold-dark">{formatBaht(myEntries)}</span>
            <ChevronRight className="h-5 w-5 text-neutral-300" />
          </div>
        </Link>
      )}

      {/* transactions */}
      <div className="card">
        <h3 className="mb-2 font-bold text-neutral-800">รายการทั้งหมด</h3>
        {completed.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-400">ยังไม่มีรายการที่สำเร็จ</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {completed.map((j) => (
              <Link key={j.id} href={`/job/${j.id}`} className="flex items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><CheckCircle2 className="h-5 w-5" /></span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-800">{j.items.map((i) => MATERIAL_MAP[i.materialId]?.emoji).join("")} {j.code}</p>
                  <p className="text-xs text-neutral-400">{thaiDate(j.scheduledDate)}</p>
                </div>
                <span className="font-bold text-brand-700">+฿{formatBaht(j.finalAmount ?? 0)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function BuyerBody({ userId, db }: { userId: string; db: ReturnType<typeof useStore>["db"] }) {
  const jobs = jobsForBuyer(db, userId);
  const completed = jobs.filter((j) => j.status === "completed");
  const totalCollected = completed.reduce((s, j) => s + (j.finalAmount ?? 0), 0);
  const active = jobs.filter((j) => j.status === "confirmed" || j.status === "en_route").length;

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="รับสำเร็จ" value={`${completed.length}`} />
        <StatCard icon={<Wallet className="h-4 w-4" />} label="ยอดรับซื้อ" value={`฿${formatBaht(totalCollected)}`} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="กำลังทำ" value={`${active}`} />
      </div>

      <Link href="/shop" className="card flex items-center gap-3 bg-brand-600 text-white">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
          <Store className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="font-bold">ระบบร้านรับซื้อ (Back-office)</p>
          <p className="text-xs text-white/80">ออกบิล · บัญชี · รายงาน — เปิดบนเว็บ</p>
        </div>
        <ChevronRight className="h-5 w-5 text-white/70" />
      </Link>

      <Link href="/prices" className="card flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Coins className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-neutral-800">ตั้งราคารับซื้อ</p>
          <p className="text-xs text-neutral-400">กำหนดราคาที่คุณรับซื้อของเก่า</p>
        </div>
        <ChevronRight className="h-5 w-5 text-neutral-300" />
      </Link>

      <div className="card">
        <h3 className="mb-2 font-bold text-neutral-800">ประวัติงานที่รับ</h3>
        {completed.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-400">ยังไม่มีงานที่สำเร็จ</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {completed.map((j) => (
              <Link key={j.id} href={`/job/${j.id}`} className="flex items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><CheckCircle2 className="h-5 w-5" /></span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-800">{j.code} · {j.sellerName}</p>
                  <p className="text-xs text-neutral-400">{thaiDate(j.scheduledDate)}</p>
                </div>
                <span className="font-bold text-neutral-700">฿{formatBaht(j.finalAmount ?? 0)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card items-start !p-3">
      <span className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">{icon}</span>
      <p className="text-base font-extrabold text-neutral-800">{value}</p>
      <p className="text-[11px] text-neutral-400">{label}</p>
    </div>
  );
}
