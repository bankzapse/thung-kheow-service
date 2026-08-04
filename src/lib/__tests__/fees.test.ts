import { describe, it, expect } from "vitest";
import {
  computeSettlement,
  COMPANY_COMMISSION_RATE,
  MAX_TICKETS_PER_JOB,
  BAHT_PER_TICKET,
} from "../fees";

describe("computeSettlement", () => {
  it("คิดค่าคอม 2% + ผู้ขายได้เต็ม + สิทธิ์ตามยอด", () => {
    const s = computeSettlement(1000);
    expect(s.goods).toBe(1000);
    expect(s.fee).toBe(20); // 1000 × 2%
    expect(s.sellerNet).toBe(1000); // ผู้ขายได้เต็ม ไม่หัก
    expect(s.tickets).toBe(10); // floor(1000 / 100)
  });

  it("sellerNet เท่ากับ goods เสมอ (ผู้ขายไม่โดนหัก)", () => {
    for (const g of [0, 55, 100, 1234, 99999]) {
      expect(computeSettlement(g).sellerNet).toBe(computeSettlement(g).goods);
    }
  });

  it("ค่าคอมปัดเศษแบบ round (ครึ่งปัดขึ้น)", () => {
    expect(computeSettlement(175).fee).toBe(4); // 175 × 0.02 = 3.5 → 4
    expect(computeSettlement(150).fee).toBe(3); // 150 × 0.02 = 3.0
    expect(computeSettlement(124).fee).toBe(2); // 124 × 0.02 = 2.48 → 2
  });

  it("ปัดยอด goods ก่อนคำนวณ", () => {
    const s = computeSettlement(1000.6);
    expect(s.goods).toBe(1001); // round(1000.6)
    expect(s.fee).toBe(20); // round(1001 × 0.02 = 20.02)
  });

  it("ยอดติดลบ/ศูนย์/NaN → 0 ทั้งหมด (fail-safe)", () => {
    for (const bad of [-50, 0, NaN, -0.4]) {
      const s = computeSettlement(bad);
      expect(s).toEqual({ goods: 0, fee: 0, sellerNet: 0, tickets: 0 });
    }
  });

  it("จำนวนสิทธิ์ถูก cap ที่ MAX_TICKETS_PER_JOB", () => {
    // ยอดที่ควรได้ 9999 สิทธิ์ ต้องถูกจำกัดที่ 50
    const s = computeSettlement(BAHT_PER_TICKET * 9999);
    expect(s.tickets).toBe(MAX_TICKETS_PER_JOB);
  });

  it("ยอดต่ำกว่า 100 บาท = 0 สิทธิ์", () => {
    expect(computeSettlement(99).tickets).toBe(0);
    expect(computeSettlement(100).tickets).toBe(1);
  });

  it("อัตราค่าคอมคงที่ 2%", () => {
    expect(COMPANY_COMMISSION_RATE).toBe(0.02);
  });
});
