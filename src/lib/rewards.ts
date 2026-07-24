import type { DB } from "./seed";
import type { Mission, MissionMetric } from "./types";
import { MATERIAL_MAP } from "./materials";
import { currentMonth } from "./utils";

export type { Mission, MissionMetric };

/**
 * ระบบรางวัลแบบ "ได้แน่นอน" (ไม่เสี่ยงโชค) — ทุกคนที่ถึงเกณฑ์ได้เท่ากัน
 * ตัดสินจากสิ่งที่ผู้ขายทำเอง ไม่ใช่ดวง → ไม่ใช่การพนัน ไม่ต้องขอใบอนุญาต
 *
 * MVP: โบนัสขั้นบันได (ตามจำนวนถุง/เดือน) + ภารกิจประจำเดือน
 * ตัวเลขทั้งหมดปรับได้ที่ไฟล์นี้ที่เดียว
 */

/** โบนัส % ตามจำนวนถุงที่หย่อนในเดือน (ยิ่งหย่อนเยอะ ยิ่งได้เพิ่ม) */
export const BONUS_TIERS = [
  { minBags: 1, pct: 0, label: "เริ่มต้น" },
  { minBags: 5, pct: 0.05, label: "ขยัน" },
  { minBags: 10, pct: 0.1, label: "ตัวจริง" },
  { minBags: 20, pct: 0.15, label: "สุดยอด" },
] as const;
export type BonusTier = (typeof BONUS_TIERS)[number];

/** ภารกิจเริ่มต้น (ค่า default) — ใช้เมื่อบริษัทยังไม่ได้ตั้งค่าเอง */
export const MISSIONS: Mission[] = [
  { key: "first", label: "หย่อนถุงแรกของเดือน", desc: "เปิดเดือนใหม่", target: 1, reward: 10, metric: "bags", unit: "ถุง" },
  { key: "five", label: "หย่อนครบ 5 ถุง", desc: "สะสมให้ถึง 5 ถุง", target: 5, reward: 30, metric: "bags", unit: "ถุง" },
  { key: "sort4", label: "คัดแยกครบ 4 ประเภท", desc: "โลหะ · พลาสติก · แก้ว · กระดาษ …", target: 4, reward: 20, metric: "categories", unit: "ประเภท" },
  { key: "kg10", label: "รวมน้ำหนัก 10 กก.", desc: "จากถุงที่คัดแยกแล้ว", target: 10, reward: 40, metric: "weight", unit: "กก." },
];

/** หน่วยแสดงผลตาม metric (ใช้ตอนบริษัทเพิ่ม/แก้ภารกิจ) */
export const METRIC_UNIT: Record<MissionMetric, string> = { bags: "ถุง", categories: "ประเภท", weight: "กก." };
export const METRIC_LABEL: Record<MissionMetric, string> = { bags: "จำนวนถุง", categories: "จำนวนประเภทวัสดุ", weight: "น้ำหนักรวม (กก.)" };

/** ภารกิจที่บริษัทตั้งไว้ (ถ้ายังไม่ตั้ง = ใช้ค่า default) */
export function activeMissions(db: DB): Mission[] {
  return db.missions && db.missions.length ? db.missions : MISSIONS;
}

export interface MonthlyReward {
  month: string;
  bagsThisMonth: number;
  pointsThisMonth: number; // แต้มจากถุงเดือนนี้ (ที่ให้คะแนนแล้ว)
  categoriesThisMonth: number;
  weightThisMonth: number;
  tier: BonusTier;
  nextTier: BonusTier | null;
  tierBonusPoints: number; // = pointsThisMonth × tier.pct
  missions: { m: Mission; current: number; done: boolean }[];
  missionBonusPoints: number; // รวม reward ของภารกิจที่ทำครบ
  totalBonusPoints: number; // โบนัสรวมเดือนนี้ (ขั้นบันได + ภารกิจ)
}

/** สรุปโบนัส + ภารกิจของผู้ขาย (คำนวณจากถุงจริง) · ระบุเดือนได้ (ดีฟอลต์ = เดือนนี้) */
export function monthlyRewards(db: DB, userId: string, month: string = currentMonth()): MonthlyReward {
  const bags = (db.bags ?? []).filter((b) => b.userId === userId && (b.droppedAt ?? "").slice(0, 7) === month);

  const bagsThisMonth = bags.length;
  const pointsThisMonth = bags.reduce((s, b) => s + (b.points ?? 0), 0);

  // ประเภทวัสดุ + น้ำหนัก จากถุงที่คัดแยกแล้ว (มี items หลังทีมงานคัดแยก)
  const cats = new Set<string>();
  let weight = 0;
  for (const b of bags) {
    for (const it of b.items ?? []) {
      const cat = MATERIAL_MAP[it.materialId]?.category;
      if (cat) cats.add(cat);
      weight += it.qty ?? 0;
    }
  }
  const categoriesThisMonth = cats.size;
  const weightThisMonth = Math.round(weight * 10) / 10;

  const tier = [...BONUS_TIERS].reverse().find((t) => bagsThisMonth >= t.minBags) ?? BONUS_TIERS[0];
  const nextTier = BONUS_TIERS.find((t) => t.minBags > bagsThisMonth) ?? null;
  const tierBonusPoints = Math.round(pointsThisMonth * tier.pct);

  const valueOf = (m: Mission) =>
    m.metric === "bags" ? bagsThisMonth : m.metric === "categories" ? categoriesThisMonth : weightThisMonth;
  const missions = activeMissions(db).map((m) => ({ m, current: valueOf(m), done: valueOf(m) >= m.target }));
  const missionBonusPoints = missions.filter((x) => x.done).reduce((s, x) => s + x.m.reward, 0);

  return {
    month,
    bagsThisMonth,
    pointsThisMonth,
    categoriesThisMonth,
    weightThisMonth,
    tier,
    nextTier,
    tierBonusPoints,
    missions,
    missionBonusPoints,
    totalBonusPoints: tierBonusPoints + missionBonusPoints,
  };
}

/** โน้ตของ pointTxn โบนัสประจำเดือน — ใช้กันจ่ายซ้ำ (ถ้ามีโน้ตนี้ = ปิดยอดแล้ว) */
export const bonusTxnNote = (month: string) => `โบนัสประจำเดือน ${month}`;

/** ปิดยอดโบนัสของเดือนนี้ไปแล้วหรือยัง (เช็คจาก pointTxn ที่มีโน้ตโบนัสของเดือนนั้น) */
export function isMonthBonusClosed(db: DB, month: string): boolean {
  return (db.pointTxns ?? []).some((t) => t.note === bonusTxnNote(month));
}

/** โบนัสที่ผู้ขายแต่ละคนจะได้ในเดือนนั้น (เฉพาะที่ > 0) — สำหรับบริษัทปิดยอด */
export function sellerBonuses(db: DB, month: string): { userId: string; name: string; bonus: number }[] {
  return (db.users ?? [])
    .filter((u) => u.role === "seller")
    .map((u) => ({ userId: u.id, name: u.name, bonus: monthlyRewards(db, u.id, month).totalBonusPoints }))
    .filter((x) => x.bonus > 0)
    .sort((a, b) => b.bonus - a.bonus);
}
