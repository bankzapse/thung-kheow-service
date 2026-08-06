import type { DB } from "./seed";
import { currentMonth } from "./utils";

/**
 * ระบบ "ชิงโชค" (lucky draw / เสี่ยงโชค) — แจกทอง/บัตรกำนัล
 * ⚠️ เป็นการเสี่ยงโชคจริง (ต่างจากภารกิจที่ได้แน่นอน) → ต้องขออนุญาตชิงโชค + แจ้ง สคบ. ก่อนเปิดใช้จริง
 *
 * เก็บ config/รอบ/รางวัล/ผู้ชนะ เป็น JSON ก้อนเดียวใน app_config key="lucky_draw"
 * (แพตเทิร์นเดียวกับภารกิจ) → ไม่ต้องมีตารางใหม่/migration
 * สิทธิ์ลุ้น = derived จากมูลค่าถุงที่คัดแยกแล้วในเดือนนั้น (ไม่เก็บตั๋วเป็นแถว)
 */

export interface DrawPrize {
  id: string;
  name: string; // เช่น "ทองคำ 1 สลึง", "บัตรกำนัล ฿500"
  value: number; // มูลค่า (บาท) — ใช้แสดงผล + คำนวณภาษี ณ ที่จ่าย 5%
  qty: number; // จำนวนรางวัลนี้ (ผู้โชคดีกี่คน)
}

export interface DrawWinner {
  prizeId: string;
  prizeName: string;
  prizeValue: number;
  userId: string;
  name: string;
  entries: number; // สิทธิ์ที่ผู้ชนะมีตอนจับ (บันทึกไว้เป็นหลักฐาน)
  drawnAt: string;
}

export interface DrawRound {
  month: string; // YYYY-MM
  prizes: DrawPrize[];
  status: "open" | "drawn";
  winners: DrawWinner[];
  drawnAt?: string;
}

export interface LuckyDrawConfig {
  enabled: boolean; // 🔌 Toggle เปิด-ปิดทั้งระบบชิงโชค
  bahtPerEntry: number; // ทุกมูลค่า ฿X ที่คัดแยกแล้ว = 1 สิทธิ์
  maxEntriesPerMonth: number; // เพดานสิทธิ์/คน/เดือน (กันสิทธิ์ล้น)
  title: string; // ชื่อแคมเปญ
  rounds: Record<string, DrawRound>; // keyed by month
}

export const DEFAULT_LUCKY_DRAW: LuckyDrawConfig = {
  enabled: false, // ปิดไว้ก่อน — บริษัทเปิดเองเมื่อขออนุญาตครบ
  bahtPerEntry: 100,
  maxEntriesPerMonth: 300,
  title: "ลุ้นโชคทุกเดือน",
  rounds: {},
};

/** config ปัจจุบัน (ถ้ายังไม่ตั้ง = ค่า default) */
export function luckyDrawConfig(db: DB): LuckyDrawConfig {
  const c = db.luckyDraw;
  if (!c) return DEFAULT_LUCKY_DRAW;
  return { ...DEFAULT_LUCKY_DRAW, ...c, rounds: c.rounds ?? {} };
}

/** มูลค่าถุงที่คัดแยกแล้วของผู้ใช้ในเดือน (= แต้ม เพราะ 1 บาท = 1 แต้ม) */
function creditedValueThisMonth(db: DB, userId: string, month: string): number {
  return (db.bags ?? [])
    .filter((b) => b.userId === userId && (b.droppedAt ?? "").slice(0, 7) === month)
    .reduce((s, b) => s + (b.points ?? 0), 0);
}

/** จำนวนสิทธิ์ลุ้นของผู้ใช้ในเดือน (derived) */
export function entriesForUser(db: DB, userId: string, cfg: LuckyDrawConfig, month: string = currentMonth()): number {
  const per = Math.max(1, cfg.bahtPerEntry);
  const raw = Math.floor(creditedValueThisMonth(db, userId, month) / per);
  return Math.max(0, Math.min(cfg.maxEntriesPerMonth, raw));
}

export interface Participant {
  userId: string;
  name: string;
  entries: number;
}

/** ผู้มีสิทธิ์ลุ้นในเดือน (ผู้ขายที่มีสิทธิ์ > 0) เรียงสิทธิ์มาก→น้อย */
export function drawParticipants(db: DB, cfg: LuckyDrawConfig, month: string = currentMonth()): Participant[] {
  return (db.users ?? [])
    .filter((u) => u.role === "seller")
    .map((u) => ({ userId: u.id, name: u.name, entries: entriesForUser(db, u.id, cfg, month) }))
    .filter((p) => p.entries > 0)
    .sort((a, b) => b.entries - a.entries);
}

/** สิทธิ์รวมทั้งระบบในเดือน */
export function totalEntries(db: DB, cfg: LuckyDrawConfig, month: string = currentMonth()): number {
  return drawParticipants(db, cfg, month).reduce((s, p) => s + p.entries, 0);
}

/** รอบของเดือน (ถ้ายังไม่มี = undefined) */
export function roundFor(cfg: LuckyDrawConfig, month: string = currentMonth()): DrawRound | undefined {
  return cfg.rounds?.[month];
}

/** รอบที่ประกาศผลแล้ว เรียงล่าสุดก่อน (ประวัติผู้โชคดี) */
export function drawnRounds(cfg: LuckyDrawConfig): DrawRound[] {
  return Object.values(cfg.rounds ?? {})
    .filter((r) => r.status === "drawn" && r.winners.length)
    .sort((a, b) => b.month.localeCompare(a.month));
}

/**
 * สุ่มผู้โชคดีแบบถ่วงน้ำหนักตามจำนวนสิทธิ์ · 1 คนได้ไม่เกิน 1 รางวัล/รอบ
 * รับ rng มาเพื่อทดสอบได้ (ดีฟอลต์ Math.random)
 */
export function pickWinners(participants: Participant[], prizes: DrawPrize[], rng: () => number = Math.random): Omit<DrawWinner, "drawnAt">[] {
  const slots = prizes.flatMap((p) => Array.from({ length: Math.max(1, Math.floor(p.qty) || 1) }, () => p));
  const winners: Omit<DrawWinner, "drawnAt">[] = [];
  const won = new Set<string>();
  for (const prize of slots) {
    const avail = participants.filter((p) => !won.has(p.userId) && p.entries > 0);
    const total = avail.reduce((s, p) => s + p.entries, 0);
    if (total <= 0) break;
    let r = rng() * total;
    let chosen = avail[avail.length - 1];
    for (const p of avail) {
      r -= p.entries;
      if (r <= 0) { chosen = p; break; }
    }
    won.add(chosen.userId);
    winners.push({ prizeId: prize.id, prizeName: prize.name, prizeValue: prize.value, userId: chosen.userId, name: chosen.name, entries: chosen.entries });
  }
  return winners;
}

/** ภาษีหัก ณ ที่จ่าย 5% ของมูลค่ารางวัลชิงโชค (ผู้จัดหักนำส่ง) */
export const WITHHOLDING_PCT = 0.05;
export const withholdingTax = (prizeValue: number) => Math.round(prizeValue * WITHHOLDING_PCT);
