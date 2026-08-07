#!/usr/bin/env node
/**
 * สร้างไอคอนแอป "TK" แบบกระจกเงา (glossy) สีเขียว → public/*.png
 *
 *   node scripts/build-icons.mjs
 *
 * ดีไซน์กลางอยู่ที่ iconSvg() — ตรงกับ src/app/icon.svg และ src/components/Logo.tsx
 * (อักษร TK เป็นเรขาคณิตล้วน ไม่พึ่งฟอนต์ → render ได้ทุกที่)
 */
import sharp from "sharp";
import { Resvg } from "@resvg/resvg-js";
import { writeFile } from "node:fs/promises";

// อักษร TK ขาว (เรขาคณิต) — viewBox 512
const TK = `
  <g fill="#ffffff">
    <rect x="132" y="168" width="120" height="36" rx="9"/>
    <rect x="174" y="168" width="36" height="180" rx="9"/>
    <rect x="272" y="168" width="36" height="180" rx="9"/>
  </g>
  <g stroke="#ffffff" stroke-width="36" stroke-linecap="round" fill="none">
    <path d="M308 258 L392 168"/>
    <path d="M308 258 L392 348"/>
  </g>`;

/** SVG ไอคอน 512×512 · maskable = เต็มขอบ (ไม่มีมุมโค้ง) + ย่อ TK เข้าเซฟโซน */
export function iconSvg({ maskable = false } = {}) {
  const rx = maskable ? 0 : 108;
  const tk = maskable ? `<g transform="translate(256 256) scale(0.78) translate(-256 -256)">${TK}</g>` : TK;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="256" y1="16" x2="256" y2="504" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3fd97f"/><stop offset="0.5" stop-color="#1c9a4e"/><stop offset="1" stop-color="#0f5f30"/>
    </linearGradient>
    <radialGradient id="gloss" cx="210" cy="46" r="440" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.52"/><stop offset="0.62" stop-color="#ffffff" stop-opacity="0.20"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#052a15" flood-opacity="0.35"/></filter>
    <clipPath id="r"><rect x="8" y="8" width="496" height="496" rx="${rx}"/></clipPath>
  </defs>
  <rect x="8" y="8" width="496" height="496" rx="${rx}" fill="url(#bg)"/>
  <g clip-path="url(#r)">
    <rect x="8" y="8" width="496" height="496" fill="url(#gloss)"/>
    <circle cx="232" cy="-196" r="560" fill="none" stroke="#ffffff" stroke-opacity="0.20" stroke-width="4"/>
  </g>
  <rect x="9" y="9" width="494" height="494" rx="${maskable ? 0 : 107}" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="2"/>
  <g filter="url(#sh)">${tk}</g>
</svg>`;
}

const render = (svg, size) => {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
  return sharp(png).png({ compressionLevel: 9 }).toBuffer();
};

const base = new URL("../public/", import.meta.url);
const std = iconSvg();
const mask = iconSvg({ maskable: true });

const jobs = [
  ["favicon-48.png", std, 48],
  ["icon-180.png", std, 180],
  ["icon-192.png", std, 192],
  ["icon-512.png", std, 512],
  ["icon-maskable-512.png", mask, 512],
];

for (const [name, svg, size] of jobs) {
  const buf = await render(svg, size);
  await writeFile(new URL(name, base), buf);
  console.log(`สร้าง public/${name} — ${(buf.length / 1024).toFixed(1)} KB (${size}×${size})`);
}
