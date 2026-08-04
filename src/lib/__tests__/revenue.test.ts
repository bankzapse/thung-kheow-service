import { describe, it, expect } from "vitest";
import {
  revenueShare,
  CONTRACT_PER_CABINET,
  PHASE1_COMPANY_RATE,
} from "../revenue";

// รายได้ที่ทำให้บริษัทเก็บค่าสัญญาครบพอดี (บริษัทได้ 80%): 14999 / 0.8
const PAYOFF_1CAB = CONTRACT_PER_CABINET / PHASE1_COMPANY_RATE; // 18748.75

describe("revenueShare — แบ่งรายได้ แฟรนไชส์ ↔ บริษัท", () => {
  it("ไม่มีตู้ (0 ตู้) → ไม่มีสัญญา, แบ่ง 80/20, progress 0 (ไม่ใช่ 100)", () => {
    const s = revenueShare(1000, 0);
    expect(s.contractTotal).toBe(0);
    expect(s.companyShare).toBe(800);
    expect(s.franchiseShare).toBe(200);
    expect(s.contractRecovered).toBe(0);
    expect(s.contractRemaining).toBe(0);
    expect(s.phase).toBe("paying");
    expect(s.progressPct).toBe(0); // regression guard: เดิมเคยคืน 1
  });

  it("เฟสผ่อน: รายได้ยังน้อย → บริษัท 80% / แฟรนไชส์ 20%", () => {
    const s = revenueShare(1000, 1);
    expect(s.contractTotal).toBe(CONTRACT_PER_CABINET);
    expect(s.companyShare).toBe(800);
    expect(s.franchiseShare).toBe(200);
    expect(s.contractRecovered).toBe(800); // = companyShare (ยังไม่ครบสัญญา)
    expect(s.contractRemaining).toBe(CONTRACT_PER_CABINET - 800);
    expect(s.phase).toBe("paying");
    expect(s.progressPct).toBeCloseTo(800 / CONTRACT_PER_CABINET, 6);
  });

  it("จุดผ่อนครบพอดี: บริษัทเก็บครบ 14,999 → เข้าเฟส active", () => {
    const s = revenueShare(PAYOFF_1CAB, 1);
    expect(s.companyShare).toBe(CONTRACT_PER_CABINET); // 0.8 × 18748.75
    expect(s.contractRecovered).toBe(CONTRACT_PER_CABINET);
    expect(s.contractRemaining).toBe(0);
    expect(s.phase).toBe("active");
    expect(s.progressPct).toBe(1);
  });

  it("เฟสครบสัญญา: ส่วนเกินแบ่งกลับ แฟรนไชส์ 80% / บริษัท 20%", () => {
    const extra = 10000;
    const s = revenueShare(PAYOFF_1CAB + extra, 1);
    // บริษัท = ค่าสัญญาเต็ม + 20% ของส่วนเกิน
    expect(s.companyShare).toBe(CONTRACT_PER_CABINET + 0.2 * extra);
    // แฟรนไชส์ = 20% ของช่วงผ่อน + 80% ของส่วนเกิน
    expect(s.franchiseShare).toBeCloseTo(0.2 * PAYOFF_1CAB + 0.8 * extra, 2);
    expect(s.contractRecovered).toBe(CONTRACT_PER_CABINET);
    expect(s.phase).toBe("active");
  });

  it("invariant: companyShare + franchiseShare = revenueTotal เสมอ", () => {
    for (const [rev, cab] of [
      [0, 1],
      [500, 1],
      [PAYOFF_1CAB, 1],
      [PAYOFF_1CAB + 5000, 1],
      [123456, 3],
      [9999, 0],
    ] as const) {
      const s = revenueShare(rev, cab);
      expect(s.companyShare + s.franchiseShare).toBeCloseTo(s.revenueTotal, 2);
    }
  });

  it("contractRecovered ไม่มีทางเกิน contractTotal", () => {
    for (const rev of [0, 1000, PAYOFF_1CAB, PAYOFF_1CAB * 5]) {
      const s = revenueShare(rev, 2);
      expect(s.contractRecovered).toBeLessThanOrEqual(s.contractTotal);
    }
  });

  it("รายได้ติดลบ → ปัดเป็น 0", () => {
    const s = revenueShare(-9999, 1);
    expect(s.revenueTotal).toBe(0);
    expect(s.companyShare).toBe(0);
    expect(s.franchiseShare).toBe(0);
  });

  it("ค่าสัญญารวม = 14,999 × จำนวนตู้", () => {
    expect(revenueShare(0, 3).contractTotal).toBe(CONTRACT_PER_CABINET * 3);
  });
});
