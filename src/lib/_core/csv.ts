/* ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ ไฟล์นี้ถูก generate อัตโนมัติ — ห้ามแก้ที่นี่ (แก้แล้วจะถูกทับรอบ sync ถัดไป)
 *
 * ต้นทาง : micro-services/packages/core/src/csv.ts
 * วิธีแก้ : แก้ที่ต้นทาง → รัน `npm test` แล้ว `npm run sync` ใน repo micro-services
 *          → commit ไฟล์ที่เปลี่ยนใน repo นี้ด้วย
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * CSV helpers — pure + ใช้ได้ทั้ง server/client
 *
 * ── สถานะการรวม ──────────────────────────────────────────────────────────
 * ที่มา: chao-dee/src/lib/csv.ts (behavior เหมือนเป๊ะ → ChaoDee adopt ได้แบบ no-op)
 *
 * ตัว escape ใน thung-kheow-service/src/lib/report.ts:134 เขียนเหมือนกัน "ทุกไบต์"
 * → ถุงเขียวเปลี่ยนมาใช้ csvCell ได้เลย ไม่มีอะไรเปลี่ยนพฤติกรรม
 *   (ส่วน reportToCsv ของถุงเขียวเป็นตัวประกอบรายงานหลายส่วน = โดเมนของแอป ไม่ย้ายมา)
 */

/** escape ค่าหนึ่งช่องตามกติกา CSV (ครอบ " เมื่อมี comma / quote / newline) */
export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** สร้างสตริง CSV จาก array ของ object (มี BOM ให้ Excel อ่านภาษาไทยถูก) */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; header: string }[]
): string {
  const head = columns.map((c) => csvCell(c.header)).join(",");
  const body = rows
    .map((r) => columns.map((c) => csvCell(r[c.key])).join(","))
    .join("\n");
  return "﻿" + head + "\n" + body;
}

/** สร้าง Response สำหรับดาวน์โหลดไฟล์ CSV (ใช้ web-standard Response ไม่ผูกกับ Next) */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
