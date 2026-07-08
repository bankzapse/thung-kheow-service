/**
 * โมเดลแบ่งรายได้ แฟรนไชส์ ↔ บริษัท (แพลตฟอร์ม)
 *
 * - ค่าสัญญาตู้ละ 14,999 บาท (บริษัทลงทุนตู้/ระบบให้)
 * - เฟส "ผ่อนค่าสัญญา": ของที่ขายได้ → บริษัท 80% · แฟรนไชส์ 20%
 *   บริษัทเก็บ 80% ไปเรื่อย ๆ จนกว่าส่วนแบ่งบริษัทจะครบค่าสัญญา (14,999 × จำนวนตู้)
 * - เฟส "ครบสัญญา": ของที่ขายได้ → แฟรนไชส์ 80% · บริษัท 20% (ค่าจ้างเก็บของ + ดูแลระบบ)
 *
 * "รายได้ที่ขายได้" = มูลค่ารีไซเคิลของถุงที่ทีมงานคัดแยกแล้ว (valueBaht)
 */
export const CONTRACT_PER_CABINET = 14999;
export const PHASE1_COMPANY_RATE = 0.8; // เฟสผ่อน: บริษัท 80%
export const PHASE2_FRANCHISE_RATE = 0.8; // เฟสครบ: แฟรนไชส์ 80%

export type RevenuePhase = "paying" | "active"; // ผ่อนค่าสัญญา | ครบสัญญาแล้ว

export interface RevenueShare {
  cabinetCount: number;
  contractTotal: number; // 14,999 × จำนวนตู้
  revenueTotal: number; // มูลค่ารีไซเคิลรวม
  companyShare: number; // ส่วนแบ่งบริษัทสะสม
  franchiseShare: number; // ส่วนแบ่งแฟรนไชส์สะสม
  contractRecovered: number; // ค่าสัญญาที่บริษัทเก็บคืนได้แล้ว (≤ contractTotal)
  contractRemaining: number; // ค่าสัญญาคงเหลือ
  phase: RevenuePhase;
  progressPct: number; // 0..1 ความคืบหน้าการผ่อน
}

const round = (n: number) => Math.round(n * 100) / 100;

export function revenueShare(revenueTotal: number, cabinetCount: number): RevenueShare {
  const R = Math.max(0, revenueTotal || 0);
  const contractTotal = CONTRACT_PER_CABINET * Math.max(0, cabinetCount || 0);
  // รายได้ที่ทำให้บริษัทเก็บครบค่าสัญญา (บริษัทได้ 80% ของรายได้)
  const revToPayoff = PHASE1_COMPANY_RATE > 0 ? contractTotal / PHASE1_COMPANY_RATE : 0;

  let companyShare: number;
  let franchiseShare: number;
  let contractRecovered: number;
  let phase: RevenuePhase;

  if (contractTotal === 0 || R <= revToPayoff) {
    // เฟสผ่อน (หรือไม่มีสัญญา) — บริษัท 80% / แฟรนไชส์ 20%
    companyShare = round(PHASE1_COMPANY_RATE * R);
    franchiseShare = round((1 - PHASE1_COMPANY_RATE) * R);
    contractRecovered = Math.min(contractTotal, companyShare);
    phase = contractTotal > 0 && companyShare >= contractTotal ? "active" : "paying";
  } else {
    // ผ่อนครบแล้ว: รายได้ส่วนเกินแบ่ง แฟรนไชส์ 80% / บริษัท 20%
    const R2 = R - revToPayoff;
    companyShare = round(contractTotal + (1 - PHASE2_FRANCHISE_RATE) * R2);
    franchiseShare = round((1 - PHASE1_COMPANY_RATE) * revToPayoff + PHASE2_FRANCHISE_RATE * R2);
    contractRecovered = contractTotal;
    phase = "active";
  }

  const contractRemaining = round(Math.max(0, contractTotal - contractRecovered));
  return {
    cabinetCount,
    contractTotal,
    revenueTotal: round(R),
    companyShare,
    franchiseShare,
    contractRecovered: round(contractRecovered),
    contractRemaining,
    phase,
    progressPct: contractTotal > 0 ? Math.min(1, contractRecovered / contractTotal) : 1,
  };
}
