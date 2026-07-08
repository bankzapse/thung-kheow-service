"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { PriceList } from "@/components/PriceList";
import { RewardTeaser } from "@/components/RewardTeaser";
import { Sheet } from "@/components/ui";
import {
  announcedDraw,
  currentDraw,
  ticketsForUser,
  jobsForSeller,
  jobsForBuyer,
  availableJobsNear,
  buyerPrice,
  activeJobs,
  incomeSummary,
  creditOf,
  pointsOf,
  dropStats,
} from "@/lib/selectors";
import { RADIUS_KM, DEFAULT_BASE } from "@/lib/geo";
import { MIN_CREDIT } from "@/lib/fees";
import { formatBaht, thaiDate } from "@/lib/utils";
import {
  Recycle,
  Plus,
  ClipboardList,
  CalendarClock,
  Wallet,
  MessageCircle,
  ChevronRight,
  TrendingUp,
  Inbox,
  Coins,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function HomePage() {
  const { db, currentUser } = useStore();
  const u = currentUser!;
  const isSeller = u.role === "seller";
  const [pricesOpen, setPricesOpen] = useState(false);

  const draw = currentDraw(db) ?? announcedDraw(db);
  const myTickets = ticketsForUser(db, u.id).length;

  const sellerJobs = jobsForSeller(db, u.id);
  const buyerJobs = jobsForBuyer(db, u.id);
  const income = incomeSummary(db, u.id);
  const points = pointsOf(db, u.id);
  const dstats = dropStats(db, u.id);
  const base = { lat: u.baseLat ?? DEFAULT_BASE.lat, lng: u.baseLng ?? DEFAULT_BASE.lng };
  const openCount = isSeller ? 0 : availableJobsNear(db, base.lat, base.lng, RADIUS_KM).length;
  const activeCount = activeJobs(isSeller ? sellerJobs : buyerJobs).length;
  const priceOf = (id: string) => buyerPrice(db, u.id, id);

  return (
    <div>
      {/* hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 px-5 pb-16 pt-11 text-white">
        <div className="absolute -right-12 -top-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/[0.06]" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">สวัสดี 👋</p>
            <h1 className="text-xl font-extrabold">{u.name}</h1>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs">
              {isSeller ? "ผู้ขาย" : "ผู้ซื้อ / คนขับ"}
            </span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Recycle className="h-7 w-7" />
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-10 max-w-md space-y-4 px-5 pb-28">
        {/* stat strip */}
        <div className="card grid grid-cols-2 divide-x divide-neutral-100">
          {isSeller ? (
            <>
              <StatMini label="คะแนนสะสม" value={formatBaht(points)} icon={<Coins className="h-4 w-4" />} />
              <StatMini label="ถุงของฉัน" value={`${dstats.totalBags} ถุง`} icon={<Recycle className="h-4 w-4" />} />
            </>
          ) : (
            <>
              <StatMini label={`งานใกล้ฉัน (${RADIUS_KM}กม.)`} value={`${openCount} งาน`} icon={<Inbox className="h-4 w-4" />} />
              <StatMini label="งานของฉัน" value={`${activeCount} งาน`} icon={<ClipboardList className="h-4 w-4" />} />
            </>
          )}
        </div>

        {/* primary actions */}
        {isSeller ? (
          <div className="space-y-3">
            {/* Drop & Go — flagship */}
            <Link
              href="/drop"
              className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-4 text-white shadow-brand transition active:scale-[0.99]"
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                <Recycle className="h-7 w-7" />
              </div>
              <div className="relative flex-1">
                <span className="mb-0.5 inline-block rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">HOT</span>
                <p className="font-bold leading-tight">Drop & Go — หย่อนถุงรับคะแนน</p>
                <p className="text-sm text-white/85">คัดแยกใส่ถุง · สแกน QR ตู้+ถุง · รอรับคะแนน</p>
              </div>
              <ChevronRight className="relative h-5 w-5 text-white/70" />
            </Link>

            <div className="grid grid-cols-2 gap-3">
              <ActionTile href="/points" icon={<Coins className="h-5 w-5" />} label="คะแนน & แลกเงิน" hint={`${formatBaht(points)} คะแนน`} accent />
              <ActionTile href="/create" icon={<Plus className="h-5 w-5" />} label="เรียกรถมารับถึงบ้าน" hint="ขายของเก่า" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ActionTile href="/jobs" icon={<ClipboardList className="h-5 w-5" />} label="รายการของฉัน" hint={`${sellerJobs.length} รายการ`} />
              <ActionTile href="/income" icon={<Wallet className="h-5 w-5" />} label="รายได้ & รางวัล" hint={`${myTickets} สิทธิ์`} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <CreditCard credit={creditOf(db, u.id)} />
            <div className="grid grid-cols-2 gap-3">
              <ActionTile href="/jobs" icon={<Inbox className="h-5 w-5" />} label="งานใกล้ฉัน" hint={`${openCount} งานในรัศมี`} accent />
              <ActionTile href="/schedule" icon={<CalendarClock className="h-5 w-5" />} label="จัดตารางรับของ" hint="รอบเข้ารับ" />
            </div>
          </div>
        )}

        {/* LINE OA banner (seller) */}
        {isSeller && !u.lineConnected && <LineBanner />}

        {/* prices */}
        <div className="card">
          <div className="mb-1 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-neutral-800">{isSeller ? "ราคาของเก่าวันนี้" : "ราคารับซื้อของฉัน"}</h2>
              <p className="text-xs text-neutral-400">{isSeller ? `อัปเดต ${thaiDate(db.pricesUpdatedAt)}` : "ราคาที่คุณรับซื้อ"}</p>
            </div>
            {isSeller ? (
              <button onClick={() => setPricesOpen(true)} className="text-sm font-semibold text-brand-600">
                ดูทั้งหมด
              </button>
            ) : (
              <Link href="/prices" className="text-sm font-semibold text-brand-600">
                แก้ไข
              </Link>
            )}
          </div>
          <PriceList limit={5} priceOf={isSeller ? undefined : priceOf} />
        </div>

        {/* reward */}
        <RewardTeaser draw={draw} tickets={isSeller ? myTickets : undefined} />
      </div>

      <Sheet open={pricesOpen} onClose={() => setPricesOpen(false)} title="ราคาของเก่าวันนี้">
        <p className="mb-2 text-xs text-neutral-400">อัปเดต {thaiDate(db.pricesUpdatedAt)} · ราคาอาจเปลี่ยนแปลงตามหน้างาน</p>
        <PriceList />
      </Sheet>
    </div>
  );
}

function StatMini({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 first:pl-0 last:pr-0">
      <span className="flex items-center gap-1 text-xs text-neutral-400">{icon}{label}</span>
      <span className="text-lg font-extrabold text-neutral-800">{value}</span>
    </div>
  );
}

function ActionTile({
  href,
  icon,
  label,
  hint,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <Link href={href} className="card flex flex-col gap-2 transition active:scale-[0.99] hover:shadow-float">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent ? "bg-brand-100 text-brand-700" : "bg-neutral-100 text-neutral-600"}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-800">{label}</p>
        <p className="text-xs text-neutral-400">{hint}</p>
      </div>
    </Link>
  );
}

function CreditCard({ credit }: { credit: number }) {
  const ready = credit >= MIN_CREDIT;
  return (
    <Link
      href="/wallet"
      className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-neutral-100 transition active:scale-[0.99]"
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${ready ? "bg-brand-100 text-brand-700" : "bg-red-100 text-red-600"}`}>
        <Coins className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-neutral-400">เครดิตพาร์ทเนอร์</p>
        <p className="text-xl font-extrabold text-neutral-800">฿{formatBaht(credit)}</p>
      </div>
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${ready ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-600"}`}>
        {ready ? <><CheckCircle2 className="h-3.5 w-3.5" /> พร้อมรับงาน</> : <><AlertTriangle className="h-3.5 w-3.5" /> เติมเครดิต</>}
      </span>
    </Link>
  );
}

function LineBanner() {
  const { connectLine } = useStore();
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#06C755]/10 p-3.5 ring-1 ring-[#06C755]/20">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06C755] text-white">
        <MessageCircle className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-neutral-800">รับแจ้งเตือนผ่าน LINE</p>
        <p className="text-xs text-neutral-500">เชื่อม LINE OA เพื่อรับสถานะงานแบบเรียลไทม์</p>
      </div>
      <button onClick={connectLine} className="rounded-lg bg-[#06C755] px-3 py-1.5 text-xs font-bold text-white">
        เชื่อม
      </button>
    </div>
  );
}
