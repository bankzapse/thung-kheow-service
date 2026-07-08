"use client";

import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { buildRevenueReport, reportToCsv, revenueReportFilename } from "@/lib/report";

/**
 * ปุ่ม export รายงานรายได้ (สำหรับบัญชี) — ใช้ได้ทั้งแดชบอร์ดแฟรนไชส์และแอดมิน
 * - CSV: สร้างจาก db ที่โหลดแล้ว (เดโม/Supabase เหมือนกัน) เปิดใน Excel/Sheets
 * - PDF: ไปหน้าพิมพ์ (/reports/revenue/print) แล้วสั่งพิมพ์ → บันทึกเป็น PDF (รองรับไทย)
 * ตัวเลขชุดเดียวกับ endpoint /api/reports/revenue เป๊ะ (ใช้ report.ts ร่วมกัน)
 */
export function RevenueExport({ franchiseId, size = "sm" }: { franchiseId?: string; size?: "sm" | "md" }) {
  const { db } = useStore();

  const downloadCsv = () => {
    const rep = buildRevenueReport(db, { franchiseId });
    const blob = new Blob([reportToCsv(rep)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = revenueReportFilename(rep);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const cls = size === "md" ? "btn-outline !py-2.5 text-sm" : "btn-outline !px-3 !py-2 text-xs";
  const printHref = franchiseId ? `/reports/revenue/print?fr=${encodeURIComponent(franchiseId)}` : "/reports/revenue/print";

  return (
    <div className="flex items-center gap-2">
      <button onClick={downloadCsv} className={cls}>
        <Download className="h-4 w-4" /> CSV
      </button>
      <Link href={printHref} className={cls}>
        <Printer className="h-4 w-4" /> PDF
      </Link>
    </div>
  );
}
