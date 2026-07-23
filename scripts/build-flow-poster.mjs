#!/usr/bin/env node
/**
 * ป้ายขั้นตอนใช้งาน ถุงเขียว (แนวนอน) → public/poster-flow.png
 *
 *   node scripts/build-flow-poster.mjs
 *
 * ออกแบบสำหรับพิมพ์ป้ายสี่เหลี่ยม 80×40 cm (อัตราส่วน 2:1)
 * เรนเดอร์ที่ ~190 DPI (6000×3000) — สั่งพิมพ์อิงค์เจ็ท/ไวนิลได้เลย
 *
 * ใช้ IBM Plex Sans Thai (ฟอนต์เดียวกับเว็บ) ผ่าน resvg — ดู build-richmenu-image.mjs
 */
import sharp from "sharp";
import QRCode from "qrcode";
import { Resvg } from "@resvg/resvg-js";
import { readFile, writeFile } from "node:fs/promises";
import { FONT_FILES, FONT_FAMILY } from "./lib/thai-font.mjs";

const LINE_OA_ID = "@200iyzrg";
const ADD_URL = `https://line.me/R/ti/p/${LINE_OA_ID}`;
const SITE = "app.thungkhiao.co";

// ผืนงานตรรกะ 4800×2400 (2:1) แล้วค่อยขยายตอนเรนเดอร์
const W = 4800;
const H = 2400;
const FONT = FONT_FAMILY;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------- ไอคอนเส้นสีขาว (วาด path เอง วางที่จุดกำเนิด ~ -40..40) ---------- */
const ICONS = {
  // เพิ่มเพื่อน LINE — กรอบแชท + เครื่องหมายบวก
  addline: `<path d="M-40-30h80a10 10 0 0110 10v36a10 10 0 01-10 10H4L-16 52V36h-24a10 10 0 01-10-10v-36a10 10 0 0110-10z" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/><path d="M0-14v28M-14 0h28" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`,
  // คัดแยกใส่ถุง — ถุงช้อปปิ้งมีหูจับ + ลูกศรรีไซเคิลจาง ๆ
  bag: `<path d="M-30-8h60v44a10 10 0 01-10 10h-40a10 10 0 01-10-10z" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/><path d="M-17-8v-9a17 17 0 0134 0v9" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M-9 20a13 13 0 0122-9M11 24a13 13 0 01-22 9" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M11 2l4 9-9 1M-11 34l-4-9 9-1" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  // สแกน QR — มุมกรอบ + เส้นสแกน
  scan: `<path d="M-36-36h20M-36-36v20M36-36H16M36-36v20M-36 36h20M-36 36v-20M36 36H16M36 36v-20" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M-30 0h60" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`,
  // หย่อนถุงลงตู้ — ลูกศรลงเข้าช่อง
  drop: `<path d="M0-36V6M-18-12L0 8l18-20" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M-34 24h68" stroke="#fff" stroke-width="8" stroke-linecap="round"/><path d="M-34 24v14a4 4 0 004 4h60a4 4 0 004-4v-14" fill="none" stroke="#fff" stroke-width="6"/>`,
  // รับคะแนน/แลกเงิน — เหรียญ ฿
  coin: `<circle r="34" fill="none" stroke="#fff" stroke-width="7"/><path d="M0-18v36M-10-10h15a8 8 0 010 16h-15M0-18h4M0 18h4" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
};

const STEPS = [
  { icon: "addline", title: "เพิ่มเพื่อนใน LINE", lines: ["สแกน QR เพิ่มเพื่อน “ถุงเขียว”", "แล้วเปิดเมนูใช้งานในแชท"] },
  { icon: "bag", title: "คัดแยกขยะใส่ถุง", lines: ["ขวด · กระป๋อง · กระดาษ · พลาสติก", "ล้างให้สะอาด · 20 ชิ้นขึ้นไป/ถุง"] },
  { icon: "scan", title: "สแกน QR บนถุง", lines: ["กดเมนู “หย่อนถุง” ในไลน์", "สแกนรหัสบนถุง เช่น TK01-0000001"] },
  { icon: "drop", title: "หย่อนถุงลงตู้", lines: ["หย่อนที่ช่องรับหน้าตู้", "ทีมงานคัดแยกที่โรงงาน"] },
  { icon: "coin", title: "รับคะแนน แลกเงิน", lines: ["คะแนนเข้าบัญชีอัตโนมัติ", "แลกเป็นเงินเข้าพร้อมเพย์ 1 คะแนน = 1 บาท"] },
];

// รับเฉพาะวัสดุเหล่านี้ (รูปจริงจาก public/img/materials)
const MATERIALS = [
  ["aluminum-can", "กระป๋อง"],
  ["pet", "ขวด PET"],
  ["hdpe", "ขวดขุ่น HDPE"],
  ["pp5", "พลาสติก PP5"],
  ["glass-bottle", "ขวดแก้ว"],
  ["cardboard", "กระดาษลัง"],
];

/* ---------- โหลด asset เป็น data URI ---------- */
async function dataUri(path, mime) {
  const buf = await readFile(new URL(path, import.meta.url));
  return `data:${mime};base64,${buf.toString("base64")}`;
}
const matUri = {};
for (const [id] of MATERIALS) matUri[id] = await dataUri(`../public/img/materials/${id}.jpg`, "image/jpeg");

// QR เพิ่มเพื่อน OA (ไม่ใช่ LIFF ตรง — ต้องเป็นเพื่อนก่อนถึงจะมี Rich Menu)
const qrPng = await QRCode.toBuffer(ADD_URL, { margin: 0, width: 700, color: { dark: "#0f3d24", light: "#ffffff" } });
const qrUri = `data:image/png;base64,${qrPng.toString("base64")}`;

// โลโก้ TK
const logoUri = await dataUri("../native/resources/logo.svg", "image/svg+xml");

/* ---------- ตำแหน่ง 5 ขั้นตอน ---------- */
const N = STEPS.length;
const MARGIN = 130;
const slot = (W - MARGIN * 2) / N;
const cx = (i) => MARGIN + slot / 2 + i * slot;
const CIRCLE_Y = 860;
const R = 186;

function step(i) {
  const s = STEPS[i];
  const x = cx(i);
  const bx = x + R - 24;
  const by = CIRCLE_Y - R + 24;
  const numBadge = `
    <circle cx="${bx}" cy="${by}" r="62" fill="#fff"/>
    <circle cx="${bx}" cy="${by}" r="62" fill="none" stroke="#15803d" stroke-width="6"/>
    <text x="${bx}" y="${by + 24}" font-family="${FONT}" font-size="68" font-weight="700"
          fill="#15803d" text-anchor="middle">${i + 1}</text>`;
  const desc = s.lines
    .map(
      (l, k) =>
        `<text x="${x}" y="${CIRCLE_Y + R + 178 + k * 68}" font-family="${FONT}" font-size="50"
           fill="#5b6b60" text-anchor="middle">${esc(l)}</text>`,
    )
    .join("");
  return `
    <circle cx="${x}" cy="${CIRCLE_Y}" r="${R}" fill="url(#gcircle)"/>
    <circle cx="${x}" cy="${CIRCLE_Y}" r="${R}" fill="none" stroke="#ffffff" stroke-width="12" opacity="0.25"/>
    <g transform="translate(${x} ${CIRCLE_Y}) scale(2.05)">${ICONS[s.icon]}</g>
    ${numBadge}
    <text x="${x}" y="${CIRCLE_Y + R + 96}" font-family="${FONT}" font-size="76" font-weight="700"
          fill="#153d29" text-anchor="middle">${esc(s.title)}</text>
    ${desc}`;
}

// ลูกศรประ ระหว่างวงกลม
function connectors() {
  let out = "";
  for (let i = 0; i < N - 1; i++) {
    const x1 = cx(i) + R + 34;
    const x2 = cx(i + 1) - R - 34;
    const my = CIRCLE_Y;
    out += `<line x1="${x1}" y1="${my}" x2="${x2 - 26}" y2="${my}" stroke="#86d0a4" stroke-width="7"
              stroke-linecap="round" stroke-dasharray="4 26"/>
            <path d="M${x2 - 30} ${my - 18}L${x2} ${my}L${x2 - 30} ${my + 18}" fill="none"
              stroke="#34a35a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return out;
}

/* ---------- แถบล่าง: วัสดุที่รับ + QR ---------- */
const BOT_Y = 1470;
const BOT_H = 700;
const SPLIT = 2760; // เส้นแบ่งซ้าย(วัสดุ) / ขวา(QR)

function materialStrip() {
  const innerX = MARGIN + 60;
  const usable = SPLIT - 90 - innerX;
  const step = usable / MATERIALS.length;
  const thumb = 150;
  const items = MATERIALS.map(([id, label], i) => {
    const mx = innerX + step / 2 + i * step;
    const ty = BOT_Y + 190;
    return `
      <clipPath id="mclip${i}"><rect x="${mx - thumb / 2}" y="${ty}" width="${thumb}" height="${thumb}" rx="34"/></clipPath>
      <image href="${matUri[id]}" x="${mx - thumb / 2}" y="${ty}" width="${thumb}" height="${thumb}"
             preserveAspectRatio="xMidYMid slice" clip-path="url(#mclip${i})"/>
      <rect x="${mx - thumb / 2}" y="${ty}" width="${thumb}" height="${thumb}" rx="34" fill="none" stroke="#e3ece6" stroke-width="3"/>
      <text x="${mx}" y="${ty + thumb + 58}" font-family="${FONT}" font-size="42" font-weight="600"
            fill="#33463b" text-anchor="middle">${esc(label)}</text>`;
  }).join("");
  return `
    <rect x="${MARGIN}" y="${BOT_Y}" width="${SPLIT - MARGIN - 60}" height="${BOT_H}" rx="44" fill="#ffffff" stroke="#e3ece6" stroke-width="3"/>
    <text x="${innerX}" y="${BOT_Y + 72}" font-family="${FONT}" font-size="54" font-weight="700" fill="#153d29">รับเฉพาะวัสดุเหล่านี้</text>
    <text x="${innerX + 470}" y="${BOT_Y + 72}" font-family="${FONT}" font-size="40" fill="#7a8a80">คัดแยก &amp; ล้างให้สะอาดก่อนใส่ถุง</text>
    ${items}`;
}

function qrCard() {
  const cardX = SPLIT;
  const cardW = W - MARGIN - cardX;
  const qr = 400;
  const qx = cardX + 80;
  const qy = BOT_Y + (BOT_H - qr) / 2;
  const tx = qx + qr + 70;
  return `
    <rect x="${cardX}" y="${BOT_Y}" width="${cardW}" height="${BOT_H}" rx="44" fill="url(#gcard)"/>
    <rect x="${qx - 26}" y="${qy - 26}" width="${qr + 52}" height="${qr + 52}" rx="30" fill="#ffffff"/>
    <image href="${qrUri}" x="${qx}" y="${qy}" width="${qr}" height="${qr}"/>
    <text x="${tx}" y="${BOT_Y + 238}" font-family="${FONT}" font-size="72" font-weight="700" fill="#ffffff">เริ่มที่นี่</text>
    <text x="${tx}" y="${BOT_Y + 316}" font-family="${FONT}" font-size="48" fill="#eafaf0">สแกนเพิ่มเพื่อนใน LINE</text>
    <rect x="${tx}" y="${BOT_Y + 362}" width="380" height="78" rx="39" fill="#ffffff"/>
    <text x="${tx + 190}" y="${BOT_Y + 415}" font-family="${FONT}" font-size="48" font-weight="700" fill="#15803d" text-anchor="middle">LINE ${esc(LINE_OA_ID)}</text>`;
}

/* ---------- ประกอบ SVG ---------- */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="gband" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#16a34a"/><stop offset="1" stop-color="#15803d"/>
    </linearGradient>
    <linearGradient id="gcircle" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#22c55e"/><stop offset="1" stop-color="#15803d"/>
    </linearGradient>
    <linearGradient id="gcard" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#16a34a"/><stop offset="1" stop-color="#0f6a34"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#f6fbf8"/>

  <!-- header -->
  <rect x="0" y="0" width="${W}" height="300" fill="url(#gband)"/>
  <image href="${logoUri}" x="${MARGIN}" y="66" width="168" height="168"/>
  <text x="${MARGIN + 210}" y="150" font-family="${FONT}" font-size="92" font-weight="700" fill="#ffffff">ถุงเขียว</text>
  <text x="${MARGIN + 210}" y="232" font-family="${FONT}" font-size="50" fill="#d9f4e3">เปลี่ยนขยะรีไซเคิลเป็นเงิน · หย่อนถุงที่ตู้ สะสมแต้ม แลกเงิน</text>
  <text x="${W - MARGIN}" y="192" font-family="${FONT}" font-size="80" font-weight="700" fill="#ffffff" text-anchor="end">ขั้นตอนการใช้งาน</text>

  <!-- flow -->
  ${connectors()}
  ${STEPS.map((_, i) => step(i)).join("")}

  <!-- bottom -->
  ${materialStrip()}
  ${qrCard()}

  <!-- footer -->
  <rect x="0" y="${H - 92}" width="${W}" height="92" fill="url(#gband)"/>
  <text x="${MARGIN}" y="${H - 32}" font-family="${FONT}" font-size="44" fill="#ffffff">${SITE}</text>
  <text x="${W / 2}" y="${H - 32}" font-family="${FONT}" font-size="44" fill="#eafaf0" text-anchor="middle">1 คะแนน = 1 บาท · โอนเข้าพร้อมเพย์</text>
  <text x="${W - MARGIN}" y="${H - 32}" font-family="${FONT}" font-size="44" font-weight="600" fill="#ffffff" text-anchor="end">Powered by ถุงเขียว</text>
</svg>`;

/* ---------- เรนเดอร์ (resvg + IBM Plex Sans Thai) ---------- */
const out = new URL("../public/poster-flow.png", import.meta.url).pathname;
const raw = new Resvg(svg, {
  font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: FONT_FAMILY },
  fitTo: { mode: "width", value: 6000 }, // 6000px / 31.5in ≈ 190 DPI ที่ 80 cm
}).render().asPng();

const buf = await sharp(raw).png({ compressionLevel: 9 }).toBuffer();
await writeFile(out, buf);
console.log(`สร้าง ${out} — ${(buf.length / 1024 / 1024).toFixed(2)} MB (พิมพ์ 80×40 cm)`);
