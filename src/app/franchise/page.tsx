"use client";

import { useStore } from "@/lib/store";
import { franchiseById, franchiseSummary, franchiseRevenue } from "@/lib/selectors";
import { CONTRACT_PER_CABINET } from "@/lib/revenue";
import { formatBaht } from "@/lib/utils";
import { RevenueExport } from "@/components/RevenueExport";
import { Box, PackageOpen, Coins, Wallet, Users, FileText, Building2, CheckCircle2, PackageCheck } from "lucide-react";

export default function FranchiseDashboard() {
  const { db, currentUser } = useStore();
  const u = currentUser!;
  const fr = franchiseById(db, u.franchiseId ?? "");
  const s = franchiseSummary(db, u.franchiseId ?? "");
  const rev = franchiseRevenue(db, u.franchiseId ?? "");

  if (!fr) return <p className="py-16 text-center text-neutral-400">ไม่พบข้อมูลแฟรนไชส์</p>;

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">แดชบอร์ดแฟรนไชส์</h1>
          <p className="text-sm text-neutral-500">
            <span className="font-mono font-semibold text-brand-700">{fr.code}</span> · {fr.name} · เจ้าของ {fr.ownerName} ({fr.phone})
          </p>
        </div>
        <RevenueExport franchiseId={fr.id} size="md" />
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Stat icon={<Box className="h-5 w-5" />} label="ตู้ในแฟรนไชส์" value={`${s.cabinetCount}`} tone="brand" />
        <Stat icon={<PackageOpen className="h-5 w-5" />} label="ถุงรอคัดแยก" value={`${s.pendingBags}`} tone={s.pendingBags > 0 ? "amber" : undefined} />
        <Stat icon={<PackageCheck className="h-5 w-5" />} label="ถุงคัดแยกแล้ว" value={`${s.creditedBags}`} sub="ให้คะแนนแล้ว" tone="brand" />
        <Stat icon={<Coins className="h-5 w-5" />} label="คะแนนจ่ายรวม" value={formatBaht(s.pointsIssued)} tone="gold" />
        <Stat icon={<Wallet className="h-5 w-5" />} label="มูลค่ารีไซเคิล" value={`฿${formatBaht(s.valueTotal)}`} />
        <Stat icon={<Users className="h-5 w-5" />} label="ผู้ทิ้งขยะ" value={`${s.dropperCount}`} sub="คน" />
      </div>

      {/* revenue & contract */}
      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 font-bold text-neutral-800"><FileText className="h-4 w-4 text-brand-600" /> รายได้ & สัญญาตู้</h2>
          {rev.phase === "active" ? (
            <span className="chip bg-brand-100 text-brand-700"><CheckCircle2 className="h-3.5 w-3.5" /> ครบสัญญาแล้ว — คุณได้ 80%</span>
          ) : (
            <span className="chip bg-amber-100 text-amber-700">กำลังผ่อนค่าสัญญา — บริษัทหัก 80%</span>
          )}
        </div>

        <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
          <span>ผ่อนค่าสัญญา (฿{formatBaht(CONTRACT_PER_CABINET)} × {rev.cabinetCount} ตู้)</span>
          <span className="font-semibold text-neutral-700">฿{formatBaht(rev.contractRecovered)} / ฿{formatBaht(rev.contractTotal)}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.round(rev.progressPct * 100)}%` }} />
        </div>
        {rev.contractRemaining > 0 && <p className="mt-1 text-xs text-neutral-400">เหลืออีก ฿{formatBaht(rev.contractRemaining)} จะครบสัญญา แล้วสัดส่วนจะกลับเป็น คุณ 80% · บริษัท 20%</p>}

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-100">
            <p className="text-xs text-neutral-400">มูลค่ารีไซเคิลรวม</p>
            <p className="text-lg font-extrabold text-neutral-800">฿{formatBaht(rev.revenueTotal)}</p>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100">
            <p className="flex items-center gap-1 text-xs text-brand-700"><Wallet className="h-3.5 w-3.5" /> ส่วนแบ่งของคุณ</p>
            <p className="text-lg font-extrabold text-brand-700">฿{formatBaht(rev.franchiseShare)}</p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-100">
            <p className="flex items-center gap-1 text-xs text-neutral-400"><Building2 className="h-3.5 w-3.5" /> ส่วนแบ่งบริษัท</p>
            <p className="text-lg font-extrabold text-neutral-700">฿{formatBaht(rev.companyShare)}</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-neutral-400">ช่วงผ่อน: บริษัท 80% / คุณ 20% จนกว่าจะครบค่าสัญญา · หลังครบ: คุณ 80% / บริษัท 20% (ค่าจ้างเก็บของ + ดูแลระบบ)</p>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "brand" | "gold" | "amber" }) {
  const toneCls =
    tone === "brand" ? "bg-brand-100 text-brand-700" : tone === "gold" ? "bg-gold/15 text-gold-dark" : tone === "amber" ? "bg-amber-100 text-amber-600" : "bg-neutral-100 text-neutral-500";
  return (
    <div className="card flex flex-col gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneCls}`}>{icon}</div>
      <div>
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold leading-tight tracking-tight text-neutral-800">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
      </div>
    </div>
  );
}
