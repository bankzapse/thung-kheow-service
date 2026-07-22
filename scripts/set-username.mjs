#!/usr/bin/env node
/**
 * ตั้ง "ชื่อผู้ใช้" ให้บัญชีหลังบ้าน (บริษัท / แฟรนไชส์ / ศูนย์คัดแยก)
 *
 *   node scripts/set-username.mjs list
 *   node scripts/set-username.mjs set <userId|เบอร์> <username> [--password] [--unlink-phone]
 *
 * ทำอะไร:
 *   - ตั้ง profiles.username
 *   - ตั้งอีเมล auth เป็น <username>@thungkheow.local  (Supabase ใช้อีเมลนี้ล็อกอิน)
 *   - --password      ถามรหัสผ่านใหม่แบบไม่แสดงบนจอ (ไม่เก็บลงไฟล์ ไม่ขึ้น git)
 *   - --unlink-phone  ปลดเบอร์ออกจากบัญชี (ใช้เมื่ออยากเอาเบอร์ไปสมัครเป็นผู้ขาย)
 *
 * ⚠️ ปลดเบอร์ก่อนตั้ง username สำเร็จ = ล็อกตัวเองออก — สคริปต์บังคับให้ตั้ง username ก่อนเสมอ
 */
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";

const ROOT = new URL("..", import.meta.url).pathname;
try {
  const env = await readFile(ROOT + ".env.local", "utf8");
  for (const l of env.split("\n")) {
    const m = l.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* ใช้ env จาก shell */ }

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("❌ ต้องมี NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local");
  process.exit(1);
}

/** error ให้อ่านรู้เรื่อง แทน stack trace ยาว ๆ (top-level await จับด้วย handler ไม่ได้) */
const fail = (status, body) => {
  if (String(body).includes("profiles.username does not exist")) {
    console.error("❌ ยังไม่ได้รัน migration");
    console.error("   เปิด Supabase → SQL Editor → รันไฟล์");
    console.error("   supabase/migrations/20260722000003_username_login.sql");
  } else {
    console.error(`❌ ${status} ${body}`);
  }
  process.exit(1);
};

const DOMAIN = "thungkheow.local";
const RE = /^[a-z0-9._-]{3,32}$/;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const rest = async (p, init) => {
  const r = await fetch(`${URL_}/rest/v1/${p}`, { ...init, headers: { ...H, Prefer: "return=representation", ...(init?.headers ?? {}) } });
  const t = await r.text();
  if (!r.ok) fail(r.status, t);
  return t ? JSON.parse(t) : null;
};
const auth = async (p, init) => {
  const r = await fetch(`${URL_}/auth/v1/${p}`, { ...init, headers: H });
  const t = await r.text();
  if (!r.ok) fail(r.status, t);
  return t ? JSON.parse(t) : null;
};

const askHidden = (q) =>
  new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const onData = (c) => { if (![13, 10].includes(c[0])) process.stdout.write(""); };
    process.stdout.write(q);
    process.stdin.on("data", onData);
    rl.question("", (a) => { process.stdin.off("data", onData); rl.close(); process.stdout.write("\n"); res(a); });
    rl._writeToOutput = () => {}; // ไม่ echo สิ่งที่พิมพ์
  });

const cmd = process.argv[2];

if (cmd === "list" || !cmd) {
  const rows = await rest("profiles?select=id,name,phone,username,role,owner&order=role");
  console.log("role       owner  username             phone           ชื่อ");
  console.log("─".repeat(78));
  for (const u of rows) {
    console.log(
      `${(u.role ?? "").padEnd(10)} ${(u.owner ? "✓" : " ").padEnd(6)} ${(u.username ?? "—").padEnd(20)} ${(u.phone ?? "—").padEnd(15)} ${u.name}`,
    );
  }
  console.log("\nตั้งชื่อผู้ใช้:  node scripts/set-username.mjs set <userId|เบอร์> <username> --password");
  process.exit(0);
}

if (cmd !== "set") {
  console.error("ใช้: list | set <userId|เบอร์> <username> [--password] [--unlink-phone]");
  process.exit(1);
}

const target = process.argv[3];
const username = String(process.argv[4] ?? "").toLowerCase();
const wantPassword = process.argv.includes("--password");
const unlinkPhone = process.argv.includes("--unlink-phone");

if (!target || !RE.test(username)) {
  console.error("❌ username ต้องเป็น a-z 0-9 . _ - ยาว 3–32 ตัว");
  process.exit(1);
}

// หาเป้าหมายจาก id หรือเบอร์ (รับทั้ง 08x / 668x)
const digits = target.replace(/\D/g, "");
const variants = digits ? [digits, digits.replace(/^0/, "66"), digits.replace(/^66/, "0")] : [];
const found = target.includes("-")
  ? await rest(`profiles?id=eq.${target}&select=id,name,phone,username,role,owner`)
  : await rest(`profiles?or=(${variants.map((v) => `phone.eq.${v}`).join(",")})&select=id,name,phone,username,role,owner`);

if (!found?.length) { console.error("❌ ไม่พบบัญชี"); process.exit(1); }
if (found.length > 1) { console.error("❌ เจอหลายบัญชี — ระบุด้วย userId แทน"); process.exit(1); }
const u = found[0];

// ชื่อซ้ำกับคนอื่นไหม
const dup = await rest(`profiles?username=eq.${username}&select=id`);
if (dup?.length && dup[0].id !== u.id) { console.error(`❌ ชื่อผู้ใช้ "${username}" ถูกใช้ไปแล้ว`); process.exit(1); }

console.log(`เป้าหมาย: ${u.name} (${u.role}${u.owner ? ", owner" : ""}) · เบอร์ ${u.phone ?? "—"}`);
console.log(`จะตั้ง  : username=${username} · อีเมลล็อกอิน=${username}@${DOMAIN}`);
if (unlinkPhone) console.log("          + ปลดเบอร์ออกจากบัญชี");

let password = null;
if (wantPassword) {
  password = await askHidden("รหัสผ่านใหม่ (พิมพ์แล้วกด Enter · ไม่แสดงบนจอ): ");
  if (String(password).length < 8) { console.error("❌ รหัสผ่านอย่างน้อย 8 ตัวอักษร"); process.exit(1); }
  const again = await askHidden("พิมพ์อีกครั้งเพื่อยืนยัน: ");
  if (again !== password) { console.error("❌ รหัสผ่านไม่ตรงกัน"); process.exit(1); }
}

// 1) อีเมล + รหัสผ่านฝั่ง auth ก่อน — ถ้าขั้นนี้ล้ม จะยังล็อกอินด้วยของเดิมได้
await auth(`admin/users/${u.id}`, {
  method: "PUT",
  body: JSON.stringify({
    email: `${username}@${DOMAIN}`,
    email_confirm: true,
    ...(password ? { password } : {}),
  }),
});
console.log("✅ ตั้งอีเมลล็อกอิน" + (password ? " + รหัสผ่าน" : "") + "แล้ว");

// 2) username ใน profiles
await rest(`profiles?id=eq.${u.id}`, { method: "PATCH", body: JSON.stringify({ username }) });
console.log("✅ ตั้ง username แล้ว");

// 3) ปลดเบอร์ — ทำหลังสุดเสมอ เพราะเป็นขั้นที่ย้อนยากถ้าอย่างอื่นล้ม
if (unlinkPhone) {
  // GoTrue admin API ไม่ลบเบอร์ให้ ไม่ว่าจะส่ง "" หรือ null — ข้ามฟิลด์นั้นไปเฉย ๆ
  // ลองผ่าน API ก่อน (เผื่อเวอร์ชันหลังรองรับ) แล้วเช็คผลจริง
  await auth(`admin/users/${u.id}`, { method: "PUT", body: JSON.stringify({ phone: null }) });
  await rest(`profiles?id=eq.${u.id}`, { method: "PATCH", body: JSON.stringify({ phone: null }) });

  const chk = await auth(`admin/users/${u.id}`, { method: "GET" });
  if (chk?.phone) {
    console.error(`\n⚠️ auth ยังจองเบอร์ ${chk.phone} อยู่ — API ลบให้ไม่ได้`);
    console.error("   profiles ว่างแล้ว แต่เบอร์นี้ยังเอาไปสมัครใหม่ไม่ได้");
    console.error("   ต้องรันใน Supabase → SQL Editor:\n");
    console.error(`   update auth.users set phone=null, phone_confirmed_at=null,`);
    console.error(`          phone_change='', phone_change_token=''`);
    console.error(`    where id = '${u.id}';\n`);
    console.error("   (ตัวอย่างพร้อมใช้: supabase/manual/unlink-phone-owner.sql)");
    process.exit(1);
  }
  console.log("✅ ปลดเบอร์ออกแล้ว (ทั้ง auth + profiles) — เบอร์นี้เอาไปสมัครใหม่ได้");
}

console.log(`\nลองเข้าสู่ระบบ: ชื่อผู้ใช้ "${username}" + รหัสผ่าน${password ? "ที่เพิ่งตั้ง" : "เดิม"}`);
