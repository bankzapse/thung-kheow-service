"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { franchisePeriodReport } from "@/lib/selectors";
import { formatBaht } from "@/lib/utils";
import { ArrowLeft, PackageOpen, PackageCheck, Wallet, Coins, Users } from "lucide-react";

type Period = "day" | "week" | "month" | "year";
const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "วันนี้" },
  { key: "week", label: "7 วัน" },
  { key: "month", label: "เดือนนี้" },
  { key: "year", label: "ปีนี้" },
];

function sinceOf(p: Period): Date {
  const d = new Date();
  if (p === "day") d.setHours(0, 0, 0, 0);
  else if (p === "week") { d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); }
  else if (p === "month") { d.setDate(1); d.setHours(0, 0, 0, 0); }
  else { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); }
  return d;
}

export default function FranchiseReportsPage() {
  const { db, currentUser } = useStore();
  const frId = currentUser?.franchiseId ?? "";
  const [period, setPeriod] = useState<Period>("month");

  const rep = useMemo(() => franchisePeriodReport(db, frId, sinceOf(period)), [db, frId, period]);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/franchise" className="mb-1 inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> แดชบอร์ด</Link>
        <h1 className="text-2xl font-bold text-neutral-800">รายงานสรุป</h1>
        <p className="text-sm text-neutral-500">สรุปกิจกรรมถุงตามช่วงเวลา (นับจากวันหย่อนถุง)</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${period === p.key ? "bg-brand-600 text-white" : "bg-white text-neutral-500 ring-1 ring-neutral-200 hover:bg-neutral-50"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat icon={<PackageOpen className="h-5 w-5" />} label="ถุงที่หย่อน" value={`${rep.bagCount}`} tone="brand" />
        <Stat icon={<PackageCheck className="h-5 w-5" />} label="คัดแยกแล้ว" value={`${rep.creditedBags}`} sub={`รอคัดแยก ${rep.pendingBags}`} />
        <Stat icon={<Users className="h-5 w-5" />} label="ผู้ทิ้ง (คน)" value={`${rep.dropperCount}`} />
        <Stat icon={<Wallet className="h-5 w-5" />} label="มูลค่ารีไซเคิล" value={`฿${formatBaht(rep.valueTotal)}`} />
        <Stat icon={<Coins className="h-5 w-5" />} label="คะแนนจ่าย" value={formatBaht(rep.pointsIssued)} tone="gold" />
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "brand" | "gold" }) {
  const ring = tone === "brand" ? "bg-brand-100 text-brand-700" : tone === "gold" ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-500";
  return (
    <div className="card">
      <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${ring}`}>{icon}</span>
      <p className="text-2xl font-extrabold text-neutral-800">{value}</p>
      <p className="text-xs text-neutral-400">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p>}
    </div>
  );
}
