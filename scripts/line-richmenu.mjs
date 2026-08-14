#!/usr/bin/env node
/**
 * ลงทะเบียน Rich Menu กับ LINE OA
 *
 *   node scripts/line-richmenu.mjs deploy   # สร้าง + อัปโหลดรูป + ตั้งเป็นเมนูเริ่มต้น
 *   node scripts/line-richmenu.mjs list     # ดูเมนูที่มีอยู่
 *   node scripts/line-richmenu.mjs clean    # ลบเมนูเก่าทั้งหมด (ยกเว้นตัวที่ใช้อยู่)
 *
 * ต้องมี env (อ่านจาก .env.local อัตโนมัติ):
 *   LINE_CHANNEL_ACCESS_TOKEN   ← Messaging API channel (คนละตัวกับ LINE Login)
 *   NEXT_PUBLIC_LIFF_ID         ← ใช้ประกอบ URL ปลายทางของแต่ละปุ่ม
 *
 * ⚠️ deploy ซ้ำจะสร้างเมนูใหม่ทุกครั้ง — รัน clean เป็นระยะไม่ให้เมนูเก่าค้าง (LINE จำกัด 1000 อัน)
 */
import { readFile } from "node:fs/promises";

// ── โหลด .env.local แบบง่าย (ไม่พึ่ง dependency) ──
try {
  const env = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* ไม่มีไฟล์ก็ใช้ env จาก shell */ }

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;

if (!TOKEN) {
  console.error("❌ ไม่มี LINE_CHANNEL_ACCESS_TOKEN — เอามาจาก Messaging API channel (คนละตัวกับ LINE Login)");
  process.exit(1);
}

const api = async (path, init = {}, base = "https://api.line.me") => {
  const res = await fetch(base + path, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : {};
};

/** พิกัดต้องตรงกับ scripts/build-richmenu-image.mjs */
const W = 2500, H = 1686, ROW = 843;
// กริด 3 คอลัมน์ × 2 แถว (6 ช่อง) — ต้องตรงกับ build-richmenu-image.mjs
const TOP = [{ x: 0, w: 1250 }, { x: 1250, w: 1250 }];
const BOTTOM = [{ x: 0, w: 833 }, { x: 833, w: 833 }, { x: 1666, w: 834 }];
const cellBox = (i) => (i < 2 ? { ...TOP[i], y: 0 } : { ...BOTTOM[i - 2], y: ROW });
const CELLS = [
  { label: "หย่อนถุง", path: "/drop" },
  { label: "คะแนน & แลกเงิน", path: "/points" },
  { label: "สถานะถุง", path: "/status" },
  { label: "หน้าแรก", path: "/home" },
  { label: "โปรไฟล์", path: "/profile" },
];

// LIFF URL + path → เปิดแอปที่หน้านั้นเลย (ต้องมี deep link ?next= ฝั่งเว็บรองรับ ซึ่งทำแล้ว)
const uri = (p) => `https://liff.line.me/${LIFF_ID}${p}`;

const buildMenu = () => ({
  size: { width: W, height: H },
  selected: true,
  name: `ถุงเขียว เมนูหลัก ${new Date().toISOString().slice(0, 10)}`,
  chatBarText: "เมนูถุงเขียว",
  areas: CELLS.map((c, i) => {
    const b = cellBox(i);
    return {
      bounds: { x: b.x, y: b.y, width: b.w, height: ROW },
      action: { type: "uri", label: c.label.slice(0, 20), uri: uri(c.path) },
    };
  }),
});

const cmd = process.argv[2] ?? "deploy";

if (cmd === "list") {
  const { richmenus } = await api("/v2/bot/richmenu/list");
  let current = null;
  try { current = (await api("/v2/bot/user/all/richmenu")).richMenuId; } catch { /* ยังไม่ได้ตั้ง */ }
  if (!richmenus?.length) console.log("(ยังไม่มีเมนู)");
  for (const m of richmenus ?? []) {
    console.log(`${m.richMenuId === current ? "▶" : " "} ${m.richMenuId}  ${m.name}`);
  }
  process.exit(0);
}

if (cmd === "clean") {
  const { richmenus } = await api("/v2/bot/richmenu/list");
  let current = null;
  try { current = (await api("/v2/bot/user/all/richmenu")).richMenuId; } catch { /* ไม่มี */ }
  let n = 0;
  for (const m of richmenus ?? []) {
    if (m.richMenuId === current) continue;
    await api(`/v2/bot/richmenu/${m.richMenuId}`, { method: "DELETE" });
    n++;
  }
  console.log(`ลบเมนูเก่า ${n} อัน (คงตัวที่ใช้อยู่ไว้)`);
  process.exit(0);
}

if (cmd !== "deploy") {
  console.error("ใช้: deploy | list | clean");
  process.exit(1);
}

if (!LIFF_ID) {
  console.error("❌ ไม่มี NEXT_PUBLIC_LIFF_ID — ปุ่มจะไม่รู้ว่าเปิดแอปไหน");
  process.exit(1);
}

// 1) สร้างเมนู
const { richMenuId } = await api("/v2/bot/richmenu", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(buildMenu()),
});
console.log(`1/3 สร้างเมนู: ${richMenuId}`);

// 2) อัปโหลดรูป (คนละโดเมน: api-data.line.me)
const img = await readFile(new URL("../public/richmenu.png", import.meta.url));
if (img.length > 1024 * 1024) {
  console.error(`❌ รูป ${(img.length / 1024).toFixed(0)} KB เกิน 1MB — รัน build-richmenu-image.mjs ใหม่`);
  process.exit(1);
}
await api(`/v2/bot/richmenu/${richMenuId}/content`, {
  method: "POST",
  headers: { "Content-Type": "image/png" },
  body: img,
}, "https://api-data.line.me");
console.log(`2/3 อัปโหลดรูป: ${(img.length / 1024).toFixed(0)} KB`);

// 3) ตั้งเป็นเมนูเริ่มต้นของผู้ใช้ทุกคน
await api(`/v2/bot/user/all/richmenu/${richMenuId}`, { method: "POST" });
console.log("3/3 ตั้งเป็นเมนูเริ่มต้นแล้ว ✅");
console.log("\nเปิดแชท OA ในมือถือแล้วดูเมนูล่างจอ (อาจต้องปิด-เปิดแชทใหม่)");
console.log("ปุ่มทั้งหมดชี้ไป:");
for (const c of CELLS) console.log(`  ${c.label.padEnd(18)} → ${uri(c.path)}`);
