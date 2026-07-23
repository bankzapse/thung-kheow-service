/**
 * รายงานรายได้ & ส่วนแบ่ง (แฟรนไชส์ ↔ บริษัท) — สำหรับบัญชี
 *
 * ฟังก์ชัน pure (ไม่แตะ window/document) — ใช้ได้ทั้งฝั่ง server (endpoint CSV)
 * และ client (ปุ่มดาวน์โหลด/พิมพ์ PDF) เพื่อให้ได้ตัวเลขชุดเดียวกันเป๊ะ
 *
 * "รายได้" = มูลค่ารีไซเคิลของถุงที่ทีมงานคัดแยกแล้ว (status='credited', valueBaht)
 * ส่วนแบ่งคำนวณตาม revenue.ts (สัญญาตู้ 14,999 · เฟสผ่อน 80/20 → เฟสครบ 20/80)
 */
import type { DB } from "./seed";
import type { MeshBag } from "./types";
import { revenueShare, type RevenueShare } from "./revenue";

export interface ReportOptions {
  franchiseId?: string; // ระบุ = เฉพาะแฟรนไชส์นี้ · undefined = ทุกแฟรนไชส์ (บริษัท)
  from?: string; // YYYY-MM-DD (นับ creditedAt ตั้งแต่วันนี้)
  to?: string; // YYYY-MM-DD (ถึงวันนี้ รวมสิ้นวัน)
}

export interface ReportCabinetRow {
  franchiseId: string;
  franchiseCode: string;
  cabinetId: string;
  cabinetCode: string;
  cabinetName: string;
  creditedBags: number;
  points: number;
  valueBaht: number;
}

export interface ReportGroup {
  franchiseId: string;
  franchiseCode: string;
  franchiseName: string;
  cabinetCount: number;
  rows: ReportCabinetRow[];
  valueTotal: number;
  share: RevenueShare;
}

export interface RevenueReport {
  scope: "franchise" | "all";
  generatedAt: string; // ISO
  from?: string;
  to?: string;
  groups: ReportGroup[];
  totals: {
    cabinetCount: number;
    valueTotal: number;
    contractTotal: number;
    contractRecovered: number;
    companyShare: number;
    franchiseShare: number;
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

/** creditedAt (ISO) อยู่ในช่วง [from, to] แบบรวมสิ้นวันของ to หรือไม่ */
function inRange(iso: string | undefined, from?: string, to?: string): boolean {
  if (!iso) return false;
  const ymd = iso.slice(0, 10);
  if (from && ymd < from) return false;
  if (to && ymd > to) return false;
  return true;
}

/** สร้างรายงานรายได้จาก DB (เดโมหรือ Supabase-loaded เหมือนกัน) */
export function buildRevenueReport(db: DB, opts: ReportOptions = {}): RevenueReport {
  const { franchiseId, from, to } = opts;
  const franchises = (db.franchises ?? []).filter((f) => !franchiseId || f.id === franchiseId);
  const cabinets = db.cabinets ?? [];
  const bags = db.bags ?? [];

  const credited = (cabinetId: string): MeshBag[] =>
    bags.filter((b) => b.cabinetId === cabinetId && b.status === "credited" && inRange(b.creditedAt, from, to));

  const groups: ReportGroup[] = franchises.map((f) => {
    const cabs = cabinets.filter((c) => c.franchiseId === f.id);
    const rows: ReportCabinetRow[] = cabs.map((c) => {
      const cb = credited(c.id);
      return {
        franchiseId: f.id,
        franchiseCode: f.code,
        cabinetId: c.id,
        cabinetCode: c.code,
        cabinetName: c.name,
        creditedBags: cb.length,
        points: cb.reduce((s, b) => s + (b.points ?? 0), 0),
        valueBaht: round(cb.reduce((s, b) => s + (b.valueBaht ?? 0), 0)),
      };
    });
    const valueTotal = round(rows.reduce((s, r) => s + r.valueBaht, 0));
    return {
      franchiseId: f.id,
      franchiseCode: f.code,
      franchiseName: f.name,
      cabinetCount: cabs.length,
      rows,
      valueTotal,
      share: revenueShare(valueTotal, cabs.length),
    };
  });

  const totals = groups.reduce(
    (t, g) => ({
      cabinetCount: t.cabinetCount + g.cabinetCount,
      valueTotal: round(t.valueTotal + g.valueTotal),
      contractTotal: t.contractTotal + g.share.contractTotal,
      contractRecovered: round(t.contractRecovered + g.share.contractRecovered),
      companyShare: round(t.companyShare + g.share.companyShare),
      franchiseShare: round(t.franchiseShare + g.share.franchiseShare),
    }),
    { cabinetCount: 0, valueTotal: 0, contractTotal: 0, contractRecovered: 0, companyShare: 0, franchiseShare: 0 }
  );

  return {
    scope: franchiseId ? "franchise" : "all",
    generatedAt: new Date().toISOString(),
    from,
    to,
    groups,
    totals,
  };
}

const PHASE_LABEL: Record<RevenueShare["phase"], string> = {
  paying: "กำลังผ่อนค่าสัญญา",
  active: "ครบสัญญาแล้ว",
};

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const row = (cells: (string | number)[]) => cells.map(csvCell).join(",");

/** แปลงรายงานเป็น CSV (มี BOM ให้ Excel อ่านภาษาไทยถูก) */
export function reportToCsv(rep: RevenueReport): string {
  const lines: string[] = [];
  const period = rep.from || rep.to ? `${rep.from ?? "เริ่มต้น"} ถึง ${rep.to ?? "ปัจจุบัน"}` : "ทั้งหมด";
  lines.push(row(["ถุงเขียว — รายงานรายได้ & ส่วนแบ่ง"]));
  lines.push(row(["ขอบเขต", rep.scope === "all" ? "ทุกแฟรนไชส์ (บริษัท)" : "เฉพาะแฟรนไชส์"]));
  lines.push(row(["ช่วงเวลา", period]));
  lines.push(row(["สร้างเมื่อ", rep.generatedAt]));
  lines.push("");

  // รายตู้
  lines.push(row(["รายตู้"]));
  lines.push(row(["แฟรนไชส์", "รหัสตู้", "ชื่อจุดตั้ง", "ถุงที่คัดแยก", "คะแนนจ่าย", "มูลค่ารีไซเคิล (บาท)"]));
  for (const g of rep.groups) {
    for (const r of g.rows) {
      lines.push(row([r.franchiseCode, r.cabinetCode, r.cabinetName, r.creditedBags, r.points, r.valueBaht]));
    }
  }
  lines.push("");

  // สรุปต่อแฟรนไชส์ + ส่วนแบ่ง
  lines.push(row(["สรุปต่อแฟรนไชส์ & ส่วนแบ่งตามสัญญา"]));
  lines.push(
    row([
      "แฟรนไชส์",
      "ชื่อ",
      "จำนวนตู้",
      "มูลค่ารวม (บาท)",
      "ค่าสัญญารวม",
      "เก็บคืนแล้ว",
      "คงเหลือ",
      "สถานะ",
      "ส่วนแบ่งบริษัท",
      "ส่วนแบ่งแฟรนไชส์",
    ])
  );
  for (const g of rep.groups) {
    const s = g.share;
    lines.push(
      row([
        g.franchiseCode,
        g.franchiseName,
        g.cabinetCount,
        g.valueTotal,
        s.contractTotal,
        s.contractRecovered,
        s.contractRemaining,
        PHASE_LABEL[s.phase],
        s.companyShare,
        s.franchiseShare,
      ])
    );
  }
  lines.push("");

  // รวมทั้งหมด
  const t = rep.totals;
  lines.push(row(["รวมทั้งหมด"]));
  lines.push(row(["จำนวนตู้", t.cabinetCount]));
  lines.push(row(["มูลค่ารีไซเคิลรวม (บาท)", t.valueTotal]));
  lines.push(row(["ค่าสัญญารวม", t.contractTotal]));
  lines.push(row(["บริษัทเก็บคืนแล้ว", t.contractRecovered]));
  lines.push(row(["ส่วนแบ่งบริษัทรวม", t.companyShare]));
  lines.push(row(["ส่วนแบ่งแฟรนไชส์รวม", t.franchiseShare]));

  return "﻿" + lines.join("\r\n");
}

/** ชื่อไฟล์รายงาน เช่น thung-kheow-revenue-GLN-2026-07-08.csv */
export function revenueReportFilename(rep: RevenueReport, ext = "csv"): string {
  const scope = rep.scope === "all" ? "all" : rep.groups[0]?.franchiseCode || "franchise";
  const day = rep.generatedAt.slice(0, 10);
  return `thung-kheow-revenue-${scope}-${day}.${ext}`;
}
