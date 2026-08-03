import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { safeNextPath } from "./safe-path"; // ย้ายมาจากไฟล์นี้ (dep-free ให้ middleware ใช้ร่วม)
export { safeNextPath };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 1,234 บาท (ไม่มีทศนิยม โดยดีฟอลต์) */
export function formatBaht(n: number, decimals = false) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(n ?? 0);
}

/** 4 ก.ค. 2569 (พ.ศ. อัตโนมัติจาก locale th-TH) */
export function thaiDate(d: string | Date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

export function thaiDateShort(d: string | Date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
  }).format(new Date(d));
}

export function thaiWeekday(d: string | Date) {
  return new Intl.DateTimeFormat("th-TH", { weekday: "long" }).format(new Date(d));
}

export function thaiDateTime(d: string | Date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

/** "2 ชั่วโมงที่แล้ว" */
export function timeAgo(d: string | Date) {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "เมื่อสักครู่";
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} ชั่วโมงที่แล้ว`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} วันที่แล้ว`;
  return thaiDate(d);
}

export function uid(prefix = "") {
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}${rand}`;
}

/** RF-4821 */
export function jobCode() {
  return "RF-" + Math.floor(1000 + Math.random() * 9000);
}

/** B-4821 (เลขบิลรับซื้อ) */
export function billCode() {
  return "B-" + Math.floor(1000 + Math.random() * 9000);
}

/** เลขสิทธิ์ลุ้นรางวัล 6 หลัก */
export function ticketNumber() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function todayISO() {
  return new Date().toISOString();
}

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function thaiMonthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(
    new Date(y, m - 1, 1),
  );
}

/* ---------------- deep link หลังล็อกอิน (?next=) ---------------- */

/**
 * กรองค่า ?next= ให้เหลือเฉพาะเส้นทางภายในเว็บเรา — คืน null ถ้าใช้ไม่ได้
 *
 * 🔒 กัน open redirect: "//evil.com" กับ "/\evil.com" เบราว์เซอร์ตีความเป็นโดเมนภายนอก
 * (protocol-relative) ถ้าปล่อยผ่านจะพาผู้ใช้ออกไปหน้าปลอมได้หลังล็อกอิน
 * และตัดหน้าล็อกอิน/เลือกพอร์ทัลออก กันเด้งวนกลับที่เดิม
 */

/** path + query ปัจจุบัน (ใช้ตอนเด้งไปล็อกอิน เพื่อกลับมาที่เดิมได้) — client เท่านั้น */
export function currentPathForNext(pathname: string): string {
  if (typeof window === "undefined") return pathname;
  return pathname + window.location.search;
}

/** อ่าน ?next= จาก URL ปัจจุบัน (ผ่านตัวกรองแล้ว) — client เท่านั้น */
export function readNextParam(): string | null {
  if (typeof window === "undefined") return null;
  return safeNextPath(new URLSearchParams(window.location.search).get("next"));
}

/** เติม ?next= เข้าไปในปลายทาง (ถ้ามี) */
export function withNext(dest: string, next: string | null): string {
  return next ? `${dest}?next=${encodeURIComponent(next)}` : dest;
}
