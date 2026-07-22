#!/usr/bin/env node
/**
 * โปสเตอร์ QR ติดหน้าตู้ Drop Bag → public/poster-cabinet.png
 *
 *   node scripts/build-cabinet-poster.mjs
 *
 * ขนาด A4 แนวตั้ง 300 DPI (2480×3508) — สั่งพิมพ์/ทำสติกเกอร์ได้เลย
 *
 * QR ชี้ไป "เพิ่มเพื่อน OA" ไม่ใช่ LIFF โดยตรง — เพราะ Add friend option
 * ตั้งเป็น normal ผู้ใช้กดข้ามได้ ถ้าเข้าทาง LIFF ตรงจะไม่ได้เป็นเพื่อน
 * → ไม่มี Rich Menu ครั้งหน้าหาทางเข้าไม่เจอ และส่งแจ้งเตือนไม่ได้
 */
import sharp from "sharp";
import QRCode from "qrcode";
import { writeFile } from "node:fs/promises";

const LINE_OA_ID = "@200iyzrg";
const ADD_URL = `https://line.me/R/ti/p/${LINE_OA_ID}`;

const W = 2480;
const H = 3508;
const FONT = "IBM Plex Sans Thai, Noto Sans Thai, Thonburi, Sarabun, sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// การ์ด QR สีขาว
const QR_SIZE = 1000;
const CARD = QR_SIZE + 190;
const CARD_X = (W - CARD) / 2;
const CARD_Y = 1180;

const STEPS = [
  ["1", "คัดแยกขยะใส่ถุง", "ขวด · กระป๋อง · กระดาษ · พลาสติก"],
  ["2", "หย่อนถุงที่ตู้นี้", "แล้วสแกน QR บนถุงในแอป"],
  ["3", "ทีมงานคัดแยก & ตีราคา", "คะแนนเข้าบัญชีอัตโนมัติ"],
  ["4", "แลกเป็นเงินเข้าพร้อมเพย์", "1 คะแนน = 1 บาท"],
];

const stepY = (i) => 2640 + i * 175;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#22c55e"/><stop offset="0.5" stop-color="#16a34a"/><stop offset="1" stop-color="#14532d"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="${W - 120}" cy="220" r="420" fill="#ffffff" opacity="0.06"/>
  <circle cx="90" cy="${H - 260}" r="360" fill="#ffffff" opacity="0.05"/>

  <!-- โลโก้ + แบรนด์ -->
  <g transform="translate(${W / 2 - 105} 190)">
    <rect width="210" height="210" rx="54" fill="#ffffff"/>
    <text x="105" y="143" font-family="${FONT}" font-size="100" font-weight="700"
          fill="#16a34a" text-anchor="middle" letter-spacing="-4">TK</text>
  </g>
  <text x="${W / 2}" y="560" font-family="${FONT}" font-size="150" font-weight="700"
        fill="#ffffff" text-anchor="middle">ถุงเขียว</text>

  <!-- พาดหัว -->
  <text x="${W / 2}" y="750" font-family="${FONT}" font-size="112" font-weight="700"
        fill="#ffffff" text-anchor="middle">${esc("เปลี่ยนขยะรีไซเคิลให้เป็นเงิน")}</text>
  <text x="${W / 2}" y="870" font-family="${FONT}" font-size="66"
        fill="#ffffff" opacity="0.92" text-anchor="middle">${esc("หย่อนถุงที่ตู้นี้ · สะสมแต้ม · แลกเงินเข้าพร้อมเพย์")}</text>

  <!-- คำสั่งเหนือ QR -->
  <rect x="${W / 2 - 560}" y="960" width="1120" height="120" rx="60" fill="#ffffff" opacity="0.18"/>
  <text x="${W / 2}" y="1042" font-family="${FONT}" font-size="62" font-weight="700"
        fill="#ffffff" text-anchor="middle">${esc("สแกน QR นี้เพื่อเริ่มใช้งาน")}</text>

  <!-- การ์ดขาวรอง QR -->
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD}" height="${CARD + 130}" rx="70" fill="#ffffff"/>
  <text x="${W / 2}" y="${CARD_Y + CARD + 62}" font-family="${FONT}" font-size="58" font-weight="700"
        fill="#16a34a" text-anchor="middle">LINE: ${esc(LINE_OA_ID)}</text>

  <!-- ขั้นตอน -->
  ${STEPS.map(([n, t, s], i) => `
    <circle cx="330" cy="${stepY(i) - 22}" r="46" fill="#ffffff" opacity="0.22"/>
    <text x="330" y="${stepY(i) - 2}" font-family="${FONT}" font-size="50" font-weight="700"
          fill="#ffffff" text-anchor="middle">${n}</text>
    <text x="420" y="${stepY(i)}" font-family="${FONT}" font-size="62" font-weight="700" fill="#ffffff">${esc(t)}</text>
    <text x="420" y="${stepY(i) + 66}" font-family="${FONT}" font-size="44"
          fill="#ffffff" opacity="0.8">${esc(s)}</text>`).join("")}

  <!-- ท้ายโปสเตอร์ -->
  <text x="${W / 2}" y="${H - 150}" font-family="${FONT}" font-size="46"
        fill="#ffffff" opacity="0.78" text-anchor="middle">${esc("ไม่ต้องติดตั้งแอป · ใช้ผ่าน LINE ได้เลย")}</text>
</svg>`;

// QR: error correction สูงสุด เผื่อโปสเตอร์เปื้อน/ถลอกตอนติดนอกอาคาร
const qr = await QRCode.toBuffer(ADD_URL, {
  errorCorrectionLevel: "H",
  margin: 1,
  width: QR_SIZE,
  color: { dark: "#14532d", light: "#ffffff" },
});

const out = new URL("../public/poster-cabinet.png", import.meta.url).pathname;
const buf = await sharp(Buffer.from(svg))
  .composite([{ input: qr, left: Math.round(CARD_X + 95), top: CARD_Y + 95 }])
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(out, buf);

console.log(`สร้าง ${out} — ${(buf.length / 1024 / 1024).toFixed(1)} MB (${W}×${H} · A4 300dpi)`);
console.log(`QR ชี้ไป: ${ADD_URL}`);
