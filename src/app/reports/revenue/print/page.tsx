"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { buildRevenueReport } from "@/lib/report";
import { formatBaht, thaiDateTime } from "@/lib/utils";
import { LogoWordmark } from "@/components/Logo";
import { Printer, ArrowLeft } from "lucide-react";

const PHASE_LABEL = { paying: "กำลังผ่อนค่าสัญญา", active: "ครบสัญญาแล้ว" } as const;

function PrintReport() {
  const { db, ready } = useStore();
  const sp = useSearchParams();
  const franchiseId = sp.get("fr") || undefined;
  const from = sp.get("from") || undefined;
  const to = sp.get("to") || undefined;

  const rep = buildRevenueReport(db, { franchiseId, from, to });

  // สั่งพิมพ์อัตโนมัติเมื่อข้อมูลพร้อม (ผู้ใช้เลือก "บันทึกเป็น PDF" ในหน้าต่างพิมพ์)
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [ready]);

  const period = from || to ? `${from ?? "เริ่มต้น"} – ${to ?? "ปัจจุบัน"}` : "ทั้งหมด";

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 text-neutral-800 print:p-0">
      {/* toolbar (ซ่อนตอนพิมพ์) */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={franchiseId ? "/franchise" : "/admin/franchises"} className="btn-ghost !px-3 !py-2 text-sm">
          <ArrowLeft className="h-4 w-4" /> กลับ
        </Link>
        <button onClick={() => window.print()} className="btn-primary !px-4 !py-2.5 text-sm">
          <Printer className="h-4 w-4" /> พิมพ์ / บันทึกเป็น PDF
        </button>
      </div>

      {/* header */}
      <div className="mb-6 flex items-start justify-between border-b border-neutral-200 pb-4">
        <div>
          <LogoWordmark size={30} />
          <h1 className="mt-3 text-xl font-bold">รายงานรายได้ & ส่วนแบ่ง</h1>
          <p className="text-sm text-neutral-500">
            ขอบเขต: {rep.scope === "all" ? "ทุกแฟรนไชส์ (บริษัท)" : `แฟรนไชส์ ${rep.groups[0]?.franchiseCode ?? ""}`} · ช่วงเวลา: {period}
          </p>
        </div>
        <p className="text-right text-xs text-neutral-400">สร้างเมื่อ<br />{thaiDateTime(rep.generatedAt)}</p>
      </div>

      {/* summary cards */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        <Card label="ตู้ทั้งหมด" value={`${rep.totals.cabinetCount}`} />
        <Card label="มูลค่ารีไซเคิลรวม" value={`฿${formatBaht(rep.totals.valueTotal)}`} />
        <Card label="ส่วนแบ่งบริษัท" value={`฿${formatBaht(rep.totals.companyShare)}`} />
        <Card label="ส่วนแบ่งแฟรนไชส์" value={`฿${formatBaht(rep.totals.franchiseShare)}`} accent />
      </div>

      {/* per-franchise summary */}
      <h2 className="mb-2 text-sm font-bold text-neutral-700">สรุปต่อแฟรนไชส์ & ส่วนแบ่งตามสัญญา (ตู้ละ 14,999)</h2>
      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-neutral-300 bg-neutral-50 text-left text-xs text-neutral-500">
            <Th>แฟรนไชส์</Th>
            <Th right>ตู้</Th>
            <Th right>มูลค่ารวม</Th>
            <Th right>ค่าสัญญา</Th>
            <Th right>เก็บคืนแล้ว</Th>
            <Th>สถานะ</Th>
            <Th right>บริษัท</Th>
            <Th right>แฟรนไชส์</Th>
          </tr>
        </thead>
        <tbody>
          {rep.groups.map((g) => (
            <tr key={g.franchiseId} className="border-b border-neutral-100">
              <Td>
                <span className="font-mono font-semibold text-brand-700">{g.franchiseCode}</span> {g.franchiseName}
              </Td>
              <Td right>{g.cabinetCount}</Td>
              <Td right>฿{formatBaht(g.valueTotal)}</Td>
              <Td right>฿{formatBaht(g.share.contractTotal)}</Td>
              <Td right>฿{formatBaht(g.share.contractRecovered)}</Td>
              <Td>
                <span className={g.share.phase === "active" ? "text-brand-700" : "text-amber-600"}>{PHASE_LABEL[g.share.phase]}</span>
              </Td>
              <Td right>฿{formatBaht(g.share.companyShare)}</Td>
              <Td right className="font-semibold text-brand-700">฿{formatBaht(g.share.franchiseShare)}</Td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* per-cabinet detail */}
      <h2 className="mb-2 text-sm font-bold text-neutral-700">รายละเอียดรายตู้</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-neutral-300 bg-neutral-50 text-left text-xs text-neutral-500">
            <Th>แฟรนไชส์</Th>
            <Th>รหัสตู้</Th>
            <Th>ชื่อจุดตั้ง</Th>
            <Th right>ถุงคัดแยก</Th>
            <Th right>คะแนนจ่าย</Th>
            <Th right>มูลค่ารีไซเคิล</Th>
          </tr>
        </thead>
        <tbody>
          {rep.groups.flatMap((g) =>
            g.rows.map((r) => (
              <tr key={r.cabinetId} className="border-b border-neutral-100">
                <Td className="font-mono text-brand-700">{r.franchiseCode}</Td>
                <Td className="font-mono">{r.cabinetCode}</Td>
                <Td>{r.cabinetName}</Td>
                <Td right>{r.creditedBags}</Td>
                <Td right>{formatBaht(r.points)}</Td>
                <Td right>฿{formatBaht(r.valueBaht)}</Td>
              </tr>
            ))
          )}
          {rep.groups.every((g) => g.rows.length === 0) && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-neutral-400">
                ยังไม่มีถุงที่คัดแยกในช่วงเวลานี้
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="mt-8 text-xs text-neutral-400">
        ถุงเขียว (Thung Khiao) · รายได้ = มูลค่ารีไซเคิลของถุงที่คัดแยกแล้ว · ส่วนแบ่งตามสัญญา: เฟสผ่อน บริษัท 80% / แฟรนไชส์ 20% → เฟสครบ แฟรนไชส์ 80% / บริษัท 20%
      </p>
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? "border-brand-200 bg-brand-50" : "border-neutral-200 bg-white"}`}>
      <p className="text-[11px] text-neutral-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${accent ? "text-brand-700" : "text-neutral-800"}`}>{value}</p>
    </div>
  );
}
function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-2 py-2 font-medium ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, right, className = "" }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={`px-2 py-1.5 ${right ? "text-right tabular-nums" : ""} ${className}`}>{children}</td>;
}

export default function RevenueReportPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-400">กำลังโหลด…</div>}>
      <PrintReport />
    </Suspense>
  );
}
