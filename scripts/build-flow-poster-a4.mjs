#!/usr/bin/env node
/**
 * ป้ายขั้นตอนใช้งาน ถุงเขียว — เวอร์ชัน A4 แนวนอนเต็มแผ่น → public/poster-flow-a4.png
 *
 *   node scripts/build-flow-poster-a4.mjs
 *
 * สัดส่วน A4 แนวนอน (297×210 mm ≈ 1.414:1) · เรนเดอร์ 3508 px = 300 DPI พอดี A4
 * ปริ้นเลือก "แนวนอน" + "พอดีหน้า" → เต็มแผ่นไม่มีขอบขาว
 * (โครง layout เดียวกับ build-flow-poster.mjs ต่างแค่ความสูง canvas + ระยะแนวตั้ง)
 */
import sharp from "sharp";
import QRCode from "qrcode";
import { Resvg } from "@resvg/resvg-js";
import { readFile, writeFile } from "node:fs/promises";
import { FONT_FILES, FONT_FAMILY } from "./lib/thai-font.mjs";

const LINE_OA_ID = "@200iyzrg";
const ADD_URL = `https://line.me/R/ti/p/${LINE_OA_ID}`;
const SITE = "thung-kheow.com";

// ผืนงาน A4 แนวนอน: 4800 × 3394 (297:210)
const W = 4800;
const H = 3394;
const FONT = FONT_FAMILY;
// แตก "ำ" (U+0E33) → nikhahit + สระอา (U+0E4D U+0E32) แก้บั๊ก resvg ที่ ำ เกยตัวถัดไป (เช่น "คำเตือน")
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ำ/g, "ํา");

const ICONS = {
  addline: `<path d="M-40-30h80a10 10 0 0110 10v36a10 10 0 01-10 10H4L-16 52V36h-24a10 10 0 01-10-10v-36a10 10 0 0110-10z" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/><path d="M0-14v28M-14 0h28" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`,
  bag: `<path d="M-30-8h60v44a10 10 0 01-10 10h-40a10 10 0 01-10-10z" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/><path d="M-17-8v-9a17 17 0 0134 0v9" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M-9 20a13 13 0 0122-9M11 24a13 13 0 01-22 9" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M11 2l4 9-9 1M-11 34l-4-9 9-1" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  scan: `<path d="M-36-36h20M-36-36v20M36-36H16M36-36v20M-36 36h20M-36 36v-20M36 36H16M36 36v-20" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M-30 0h60" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`,
  drop: `<path d="M0-36V6M-18-12L0 8l18-20" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M-34 24h68" stroke="#fff" stroke-width="8" stroke-linecap="round"/><path d="M-34 24v14a4 4 0 004 4h60a4 4 0 004-4v-14" fill="none" stroke="#fff" stroke-width="6"/>`,
  coin: `<circle r="34" fill="none" stroke="#fff" stroke-width="7"/><path d="M0-18v36M-10-10h15a8 8 0 010 16h-15M0-18h4M0 18h4" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
};

const STEPS = [
  { icon: "addline", title: "เพิ่มเพื่อนใน LINE", lines: ["สแกน QR นี้เพื่อเพิ่มเพื่อน", "แล้วเปิดเมนูใช้งานในแชท"] },
  { icon: "bag", title: "คัดแยกขยะใส่ถุง", lines: ["ขวด · กระป๋อง · กระดาษ · พลาสติก", "ล้างให้สะอาด · 20 ชิ้นขึ้นไป/ถุง"] },
  { icon: "scan", title: "สแกน QR บนถุง", lines: ["กดเมนู “หย่อนถุง” ในไลน์", "สแกนรหัสบนถุง เช่น TK01-0000001"] },
  { icon: "drop", title: "หย่อนถุงลงตู้", lines: ["หย่อนที่ช่องรับหน้าตู้", "ทีมงานคัดแยกที่โรงงาน"] },
  { icon: "coin", title: "รับคะแนน แลกเงิน", lines: ["คะแนนเข้าบัญชีอัตโนมัติ", "แลกเป็นเงินเข้าพร้อมเพย์ 1 คะแนน = 1 บาท"] },
];

const MATERIALS = [
  ["aluminum-can", "กระป๋อง"],
  ["pet", "ขวด PET"],
  ["hdpe", "ขวดขุ่น HDPE"],
  ["pp5", "พลาสติก PP5"],
  ["glass-bottle", "ขวดแก้ว"],
  ["cardboard", "กระดาษลัง"],
];

async function dataUri(path, mime) {
  const buf = await readFile(new URL(path, import.meta.url));
  return `data:${mime};base64,${buf.toString("base64")}`;
}
const matUri = {};
for (const [id] of MATERIALS) matUri[id] = await dataUri(`../public/img/materials/${id}.jpg`, "image/jpeg");

const qrPng = await QRCode.toBuffer(ADD_URL, { margin: 0, width: 700, color: { dark: "#0f3d24", light: "#ffffff" } });
const qrUri = `data:image/png;base64,${qrPng.toString("base64")}`;
const logoUri = await dataUri("../native/resources/logo.svg", "image/svg+xml");

/* ---------- 5 ขั้นตอน (จัดกลางแนวตั้งพอดี A4) ---------- */
const N = STEPS.length;
const MARGIN = 130;
const slot = (W - MARGIN * 2) / N;
const cx = (i) => MARGIN + slot / 2 + i * slot;
const CIRCLE_Y = 1000; // จัดกลางช่วงบน · วงใหญ่ขึ้นเต็มพื้นที่ใต้ header
const R = 250;

function step(i) {
  const s = STEPS[i];
  const x = cx(i);
  const bx = x + R - 28;
  const by = CIRCLE_Y - R + 28;
  const numBadge = `
    <circle cx="${bx}" cy="${by}" r="80" fill="#fff"/>
    <circle cx="${bx}" cy="${by}" r="80" fill="none" stroke="#15803d" stroke-width="7"/>
    <text x="${bx}" y="${by + 30}" font-family="${FONT}" font-size="86" font-weight="700"
          fill="#15803d" text-anchor="middle">${i + 1}</text>`;
  const desc = s.lines
    .map(
      (l, k) =>
        `<text x="${x}" y="${CIRCLE_Y + R + 206 + k * 90}" font-family="${FONT}" font-size="52"
           fill="#5b6b60" text-anchor="middle">${esc(l)}</text>`,
    )
    .join("");
  const title = `<text x="${x}" y="${CIRCLE_Y + R + 118}" font-family="${FONT}" font-size="90" font-weight="700"
          fill="#153d29" text-anchor="middle">${esc(s.title)}</text>`;

  // ขั้นตอน 1: การ์ด QR สแกนเพิ่มเพื่อนแทนไอคอน (badge อยู่แถบขาวด้านบน ไม่ทับ finder ของ QR)
  if (i === 0) {
    const q = 370;
    const qx = x - q / 2;
    const qy = CIRCLE_Y - R + 120;
    return `
      <rect x="${x - R}" y="${CIRCLE_Y - R}" width="${2 * R}" height="${2 * R}" rx="56" fill="#ffffff" stroke="#dfeae3" stroke-width="5"/>
      <image href="${qrUri}" x="${qx}" y="${qy}" width="${q}" height="${q}"/>
      ${numBadge}
      ${title}
      ${desc}`;
  }
  return `
    <circle cx="${x}" cy="${CIRCLE_Y}" r="${R}" fill="url(#gcircle)"/>
    <circle cx="${x}" cy="${CIRCLE_Y}" r="${R}" fill="none" stroke="#ffffff" stroke-width="14" opacity="0.25"/>
    <g transform="translate(${x} ${CIRCLE_Y}) scale(2.7)">${ICONS[s.icon]}</g>
    ${numBadge}
    ${title}
    ${desc}`;
}

function connectors() {
  let out = "";
  for (let i = 0; i < N - 1; i++) {
    const x1 = cx(i) + R + 44;
    const x2 = cx(i + 1) - R - 44;
    const my = CIRCLE_Y;
    out += `<line x1="${x1}" y1="${my}" x2="${x2 - 30}" y2="${my}" stroke="#86d0a4" stroke-width="8"
              stroke-linecap="round" stroke-dasharray="4 30"/>
            <path d="M${x2 - 34} ${my - 22}L${x2} ${my}L${x2 - 34} ${my + 22}" fill="none"
              stroke="#34a35a" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return out;
}

/* ---------- แถบล่าง: วัสดุที่รับ + QR ---------- */
const BOT_Y = 1856; // ดันแถบล่างขึ้น · การ์ดสูงขึ้นให้เต็มช่วงล่าง A4
const BOT_H = 1120;
const SPLIT = 2760;

function materialStrip() {
  const innerX = MARGIN + 70;
  const usable = SPLIT - 100 - innerX;
  const step = usable / MATERIALS.length;
  const thumb = 360;
  const ty = BOT_Y + 444;
  const items = MATERIALS.map(([id, label], i) => {
    const mx = innerX + step / 2 + i * step;
    return `
      <clipPath id="mclip${i}"><rect x="${mx - thumb / 2}" y="${ty}" width="${thumb}" height="${thumb}" rx="60"/></clipPath>
      <image href="${matUri[id]}" x="${mx - thumb / 2}" y="${ty}" width="${thumb}" height="${thumb}"
             preserveAspectRatio="xMidYMid slice" clip-path="url(#mclip${i})"/>
      <rect x="${mx - thumb / 2}" y="${ty}" width="${thumb}" height="${thumb}" rx="60" fill="none" stroke="#e3ece6" stroke-width="5"/>
      <text x="${mx}" y="${ty + thumb + 88}" font-family="${FONT}" font-size="62" font-weight="600"
            fill="#33463b" text-anchor="middle">${esc(label)}</text>`;
  }).join("");
  const cardRight = MARGIN + (SPLIT - MARGIN - 60);
  const pillW = 960;
  const pillH = 92;
  const pillX = cardRight - 46 - pillW;
  const pillY = BOT_Y + 50;
  const icx = pillX + 62;
  const icy = pillY + pillH / 2;
  const warn = `
    <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" fill="#dc2626"/>
    <circle cx="${icx}" cy="${icy}" r="31" fill="#ffffff"/>
    <path d="M${icx - 13} ${icy - 13}L${icx + 13} ${icy + 13}M${icx + 13} ${icy - 13}L${icx - 13} ${icy + 13}"
          stroke="#dc2626" stroke-width="8" stroke-linecap="round"/>
    <text x="${icx + 54}" y="${icy + 20}" font-family="${FONT}" font-size="52" font-weight="700" fill="#ffffff">ห้ามทิ้งขยะทั่วไป · ขยะเปียก</text>`;
  return `
    <rect x="${MARGIN}" y="${BOT_Y}" width="${SPLIT - MARGIN - 60}" height="${BOT_H}" rx="52" fill="#ffffff" stroke="#e3ece6" stroke-width="4"/>
    <text x="${innerX}" y="${BOT_Y + 116}" font-family="${FONT}" font-size="76" font-weight="700" fill="#153d29">รับเฉพาะวัสดุเหล่านี้</text>
    <text x="${innerX}" y="${BOT_Y + 196}" font-family="${FONT}" font-size="50" fill="#5b6b60">ล้างสะอาด · แห้ง · แยกชิ้น · ไม่ปนขยะเปียก</text>
    ${warn}
    ${items}`;
}

function rightColumn() {
  const cardX = SPLIT;
  const cardW = W - MARGIN - cardX;
  const GAP = 28;
  const qcH = 640;
  const wcY = BOT_Y + qcH + GAP;
  const wcH = BOT_H - qcH - GAP;

  // แบนเนอร์โปรโมท: หย่อนถุงสะสมสิทธิ์ ลุ้นโชคทุกเดือน (QR ย้ายไปอยู่ขั้นตอน 1 แล้ว)
  const gcy = BOT_Y + 300;
  const gcx = cardX + 196;
  const tx = cardX + 406;
  const gift = `
    <circle cx="${gcx}" cy="${gcy}" r="150" fill="#ffffff"/>
    <g transform="translate(${gcx} ${gcy}) scale(0.92)" fill="none" stroke="#15803d" stroke-width="12"
       stroke-linejoin="round" stroke-linecap="round">
      <rect x="-64" y="-22" width="128" height="94" rx="12"/>
      <rect x="-78" y="-52" width="156" height="34" rx="10"/>
      <path d="M0-52 V72"/>
      <ellipse cx="-24" cy="-66" rx="24" ry="17"/>
      <ellipse cx="24" cy="-66" rx="24" ry="17"/>
    </g>`;
  const promoCard = `
    <rect x="${cardX}" y="${BOT_Y}" width="${cardW}" height="${qcH}" rx="52" fill="url(#gcard)"/>
    ${gift}
    <text x="${tx}" y="${BOT_Y + 224}" font-family="${FONT}" font-size="88" font-weight="700" fill="#ffffff">${esc("ลุ้นโชคทุกเดือน")}</text>
    <text x="${tx}" y="${BOT_Y + 314}" font-family="${FONT}" font-size="52" fill="#eafaf0">${esc("หย่อนถุงสะสมสิทธิ์ ยิ่งหย่อนยิ่งมีลุ้น")}</text>
    <rect x="${tx}" y="${BOT_Y + 372}" width="560" height="96" rx="48" fill="#ffffff"/>
    <text x="${tx + 280}" y="${BOT_Y + 436}" font-family="${FONT}" font-size="52" font-weight="700" fill="#15803d" text-anchor="middle">${esc("จับรางวัลทุกสิ้นเดือน")}</text>`;

  const triX = cardX + 130;
  const triCY = wcY + wcH / 2;
  const tri = `
    <g transform="translate(${triX} ${triCY}) scale(1.42)">
      <path d="M0-52 L58 50 H-58 Z" fill="none" stroke="#b91c1c" stroke-width="11" stroke-linejoin="round"/>
      <path d="M0-24 V14" stroke="#b91c1c" stroke-width="11" stroke-linecap="round"/>
      <circle cx="0" cy="34" r="6.5" fill="#b91c1c"/>
    </g>`;
  const wtx = triX + 130;
  const warnCard = `
    <rect x="${cardX}" y="${wcY}" width="${cardW}" height="${wcH}" rx="52" fill="#fff5f5" stroke="#f2b5b5" stroke-width="4"/>
    ${tri}
    <text x="${wtx}" y="${wcY + wcH / 2 - 30}" font-family="${FONT}" font-size="66" font-weight="700" fill="#991b1b">${esc("คำเตือน! การขโมยถุง")}</text>
    <text x="${wtx}" y="${wcY + wcH / 2 + 60}" font-family="${FONT}" font-size="66" font-weight="700" fill="#991b1b">${esc("มีโทษตามกฎหมาย")}</text>`;

  return promoCard + warnCard;
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
  <rect x="0" y="0" width="${W}" height="430" fill="url(#gband)"/>
  <image href="${logoUri}" x="${MARGIN}" y="92" width="248" height="248"/>
  <text x="${MARGIN + 302}" y="216" font-family="${FONT}" font-size="140" font-weight="700" fill="#ffffff">ถุงเขียว</text>
  <text x="${MARGIN + 302}" y="308" font-family="${FONT}" font-size="60" fill="#d9f4e3">เปลี่ยนขยะรีไซเคิลเป็นเงิน · หย่อนถุงที่ตู้ สะสมแต้ม แลกเงิน</text>
  <text x="${W - MARGIN}" y="262" font-family="${FONT}" font-size="104" font-weight="700" fill="#ffffff" text-anchor="end">ขั้นตอนการใช้งาน</text>

  <!-- flow -->
  ${connectors()}
  ${STEPS.map((_, i) => step(i)).join("")}

  <!-- bottom -->
  ${materialStrip()}
  ${rightColumn()}

  <!-- footer -->
  <rect x="0" y="${H - 120}" width="${W}" height="120" fill="url(#gband)"/>
  <text x="${MARGIN}" y="${H - 44}" font-family="${FONT}" font-size="52" fill="#ffffff">${SITE}</text>
  <text x="${W / 2}" y="${H - 44}" font-family="${FONT}" font-size="52" fill="#eafaf0" text-anchor="middle">1 คะแนน = 1 บาท · โอนเข้าพร้อมเพย์</text>
  <text x="${W - MARGIN}" y="${H - 44}" font-family="${FONT}" font-size="52" font-weight="600" fill="#ffffff" text-anchor="end">Powered by ถุงเขียว</text>
</svg>`;

/* ---------- เรนเดอร์ (300 DPI พอดี A4 แนวนอน) ---------- */
const out = new URL("../public/poster-flow-a4.png", import.meta.url).pathname;
const raw = new Resvg(svg, {
  font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: FONT_FAMILY },
  fitTo: { mode: "width", value: 3508 }, // 3508 px = 297 mm @ 300 DPI
}).render().asPng();

const buf = await sharp(raw).png({ compressionLevel: 9 }).toBuffer();
await writeFile(out, buf);
console.log(`สร้าง ${out} — ${(buf.length / 1024 / 1024).toFixed(2)} MB (A4 แนวนอน 297×210 mm @ 300 DPI)`);
