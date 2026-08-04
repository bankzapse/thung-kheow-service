import { describe, it, expect } from "vitest";
import {
  monthlyRewards,
  isMonthBonusClosed,
  sellerBonuses,
  bonusTxnNote,
  BONUS_TIERS,
} from "../rewards";
import { db, seller, bag, pointTxn } from "./_fixtures";
import type { BagItem } from "../types";

const M = "2026-07";
const inM = (i: number) => `2026-07-${String(i).padStart(2, "0")}T00:00:00.000Z`;

// ถุงคละ 4 ประเภท น้ำหนักรวม 11 กก. (โลหะ/พลาสติก/แก้ว/กระดาษ)
const fourCats: BagItem[] = [
  { materialId: "aluminum-can", name: "กระป๋อง", qty: 3, pricePerUnit: 45, subtotal: 135 },
  { materialId: "pet", name: "ขวด PET", qty: 3, pricePerUnit: 10, subtotal: 30 },
  { materialId: "glass-bottle", name: "ขวดแก้ว", qty: 2, pricePerUnit: 2, subtotal: 4 },
  { materialId: "cardboard", name: "กระดาษลัง", qty: 3, pricePerUnit: 4, subtotal: 12 },
];

describe("monthlyRewards — โบนัสขั้นบันได + ภารกิจ", () => {
  it("5 ถุง → tier 'ขยัน' (5%) + ภารกิจ first & five ครบ", () => {
    const bags = Array.from({ length: 5 }, (_, i) =>
      bag({ id: `b${i}`, userId: "u1", points: 100, droppedAt: inM(i + 1) }),
    );
    const r = monthlyRewards(db({ bags }), "u1", M);

    expect(r.bagsThisMonth).toBe(5);
    expect(r.pointsThisMonth).toBe(500);
    expect(r.tier.pct).toBe(0.05);
    expect(r.tierBonusPoints).toBe(25); // 500 × 5%

    const first = r.missions.find((x) => x.m.key === "first")!;
    const five = r.missions.find((x) => x.m.key === "five")!;
    expect(first.done).toBe(true);
    expect(five.done).toBe(true);
    // ภารกิจ categories/weight ยังไม่ครบ (ถุงไม่มี items)
    expect(r.missions.find((x) => x.m.key === "sort4")!.done).toBe(false);
    expect(r.missionBonusPoints).toBe(10 + 30);
    expect(r.totalBonusPoints).toBe(25 + 40);
  });

  it("คิดประเภทวัสดุ + น้ำหนักจาก items ที่คัดแยกแล้ว", () => {
    const bags = [bag({ id: "b1", userId: "u1", points: 100, items: fourCats, droppedAt: inM(2) })];
    const r = monthlyRewards(db({ bags }), "u1", M);
    expect(r.categoriesThisMonth).toBe(4);
    expect(r.weightThisMonth).toBe(11);
    expect(r.missions.find((x) => x.m.key === "sort4")!.done).toBe(true); // 4 ประเภท
    expect(r.missions.find((x) => x.m.key === "kg10")!.done).toBe(true); // 11 กก.
  });

  it.each([
    [0, 0, BONUS_TIERS[0].minBags], // 0 ถุง → tier เริ่มต้น, ยังต้องหย่อนอีกถึง tier แรก
    [4, 0, 5],
    [5, 0.05, 10],
    [10, 0.1, 20],
    [20, 0.15, null],
  ])("%i ถุง → โบนัส %f, nextTier.minBags = %o", (n, pct, nextMin) => {
    const bags = Array.from({ length: n }, (_, i) =>
      bag({ id: `b${i}`, userId: "u1", points: 10, droppedAt: inM((i % 28) + 1) }),
    );
    const r = monthlyRewards(db({ bags }), "u1", M);
    expect(r.bagsThisMonth).toBe(n);
    expect(r.tier.pct).toBe(pct);
    expect(r.nextTier?.minBags ?? null).toBe(nextMin);
  });

  it("นับเฉพาะถุงของ user นั้น + เดือนนั้น (กันปนข้ามคน/ข้ามเดือน)", () => {
    const bags = [
      bag({ id: "a", userId: "u1", points: 100, droppedAt: inM(10) }), // นับ
      bag({ id: "b", userId: "u2", points: 100, droppedAt: inM(10) }), // คนอื่น
      bag({ id: "c", userId: "u1", points: 100, droppedAt: "2026-06-30T00:00:00.000Z" }), // เดือนก่อน
    ];
    const r = monthlyRewards(db({ bags }), "u1", M);
    expect(r.bagsThisMonth).toBe(1);
    expect(r.pointsThisMonth).toBe(100);
  });
});

describe("isMonthBonusClosed — กันจ่ายโบนัสซ้ำ", () => {
  it("ยังไม่ปิดยอด = false", () => {
    expect(isMonthBonusClosed(db(), M)).toBe(false);
  });
  it("มี pointTxn โน้ตโบนัสของเดือนนั้น = true", () => {
    const d = db({ pointTxns: [pointTxn({ id: "t1", userId: "u1", note: bonusTxnNote(M) })] });
    expect(isMonthBonusClosed(d, M)).toBe(true);
    expect(isMonthBonusClosed(d, "2026-08")).toBe(false); // คนละเดือน
  });
});

describe("sellerBonuses — รายชื่อผู้ขายที่ได้โบนัส (สำหรับปิดยอด)", () => {
  it("เฉพาะ seller ที่โบนัส > 0 เรียงจากมากไปน้อย", () => {
    const bags = [
      ...Array.from({ length: 10 }, (_, i) => bag({ id: `x${i}`, userId: "u1", points: 100, droppedAt: inM((i % 28) + 1) })),
      ...Array.from({ length: 5 }, (_, i) => bag({ id: `y${i}`, userId: "u2", points: 100, droppedAt: inM((i % 28) + 1) })),
    ];
    const d = db({
      users: [seller("u1", "สมชาย"), seller("u2", "สมหญิง"), seller("u3", "ไม่มีถุง")],
      bags,
    });
    const list = sellerBonuses(d, M);
    expect(list.map((x) => x.userId)).toEqual(["u1", "u2"]); // u3 ไม่มีโบนัส → ตัดออก
    expect(list[0].bonus).toBeGreaterThan(list[1].bonus); // เรียงมาก→น้อย
  });
});
