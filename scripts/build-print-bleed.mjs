#!/usr/bin/env node
/**
 * ห่อไฟล์โปสเตอร์ (trim) → เวอร์ชันส่งโรงพิมพ์ พร้อม bleed + crop marks
 *
 *   node scripts/build-print-bleed.mjs [ชื่อไฟล์ใน public/ ไม่ต้องมี .png]
 *   # ค่าเริ่มต้น: poster-flow-a4  →  public/poster-flow-a4-print.png
 *
 * - bleed 3 มม. รอบด้าน: ยืดสีขอบของงานออกไป (ขอบเป็นสีทึบ/ไล่เฉดต่อเนื่อง จึงเนียน)
 * - crop marks (เส้นตัด) มุมละ 2 เส้น เว้นจากเส้น trim เท่าระยะ bleed ตามมาตรฐาน
 * - งานต้นทางต้องเป็น A4 300 DPI (3508×2480) — trim = 297×210 มม.
 *
 * ⚠️ รันหลังสร้างไฟล์ trim แล้ว (เช่น node scripts/build-flow-poster-a4.mjs ก่อน)
 */
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const name = process.argv[2] ?? "poster-flow-a4";
const src = new URL(`../public/${name}.png`, import.meta.url).pathname;
const out = new URL(`../public/${name}-print.png`, import.meta.url).pathname;

const DPI = 300;
const mm = (v) => Math.round((v / 25.4) * DPI);
const BLEED = mm(3); // ยืดงานเลย trim ออกไป 3 มม.
const MARK = mm(3); // ความยาวเส้นตัด 3 มม.
const PAD = mm(1.5); // เว้นปลายเส้นตัดจากขอบผืน 1.5 มม.
const EXTRA = BLEED + MARK + PAD; // ขอบผืนรวมเลย trim ออกไปแต่ละด้าน

const { width: TW, height: TH } = await sharp(src).metadata();
if (TW !== 3508 || TH !== 2480) {
  console.warn(`⚠️ คาดหวัง A4 300dpi 3508×2480 แต่ไฟล์เป็น ${TW}×${TH} — เส้นตัดยังอิงขนาดจริง`);
}

const CW = TW + 2 * EXTRA;
const CH = TH + 2 * EXTRA;

// ── bleed: ยืด (copy) พิกเซลขอบออกไปรอบด้าน ──
const bleedBuf = await sharp(src)
  .extend({ top: BLEED, bottom: BLEED, left: BLEED, right: BLEED, extendWith: "copy" })
  .png()
  .toBuffer();

// ตำแหน่งเส้น trim บนผืนใหญ่
const L = EXTRA, T = EXTRA, Rr = EXTRA + TW, B = EXTRA + TH;
const marks = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}">
  <g stroke="#000000" stroke-width="3" shape-rendering="crispEdges">
    <line x1="${L}" y1="${PAD}" x2="${L}" y2="${T - BLEED}"/>
    <line x1="${PAD}" y1="${T}" x2="${L - BLEED}" y2="${T}"/>
    <line x1="${Rr}" y1="${PAD}" x2="${Rr}" y2="${T - BLEED}"/>
    <line x1="${CW - PAD}" y1="${T}" x2="${Rr + BLEED}" y2="${T}"/>
    <line x1="${L}" y1="${B + BLEED}" x2="${L}" y2="${CH - PAD}"/>
    <line x1="${PAD}" y1="${B}" x2="${L - BLEED}" y2="${B}"/>
    <line x1="${Rr}" y1="${B + BLEED}" x2="${Rr}" y2="${CH - PAD}"/>
    <line x1="${CW - PAD}" y1="${B}" x2="${Rr + BLEED}" y2="${B}"/>
  </g>
</svg>`;

const buf = await sharp({ create: { width: CW, height: CH, channels: 4, background: "#ffffff" } })
  .composite([
    { input: bleedBuf, left: EXTRA - BLEED, top: EXTRA - BLEED },
    { input: Buffer.from(marks), left: 0, top: 0 },
  ])
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(out, buf);

console.log(`สร้าง ${out}`);
console.log(`  ผืนรวม ${CW}×${CH}px · trim ${TW}×${TH}px (297×210มม.) · bleed 3มม. · crop marks 3มม.`);
