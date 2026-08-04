import { describe, it, expect } from "vitest";
import { buildRevenueReport, csvCell, reportToCsv } from "../report";
import { revenueShare } from "../revenue";
import { db, franchise, cabinet, bag } from "./_fixtures";

function sampleDb() {
  return db({
    franchises: [franchise("f1", "GLN")],
    cabinets: [cabinet("c1", "f1", "AA"), cabinet("c2", "f1", "BB")],
    bags: [
      bag({ id: "b1", userId: "u1", cabinetId: "c1", status: "credited", valueBaht: 1000, points: 1000, creditedAt: "2026-07-10T00:00:00.000Z" }),
      bag({ id: "b2", userId: "u1", cabinetId: "c1", status: "credited", valueBaht: 500, points: 500, creditedAt: "2026-07-20T00:00:00.000Z" }),
      bag({ id: "b3", userId: "u2", cabinetId: "c2", status: "credited", valueBaht: 2000, points: 2000, creditedAt: "2026-07-15T00:00:00.000Z" }),
      // ยังไม่ credited → ไม่นับ
      bag({ id: "b4", userId: "u1", cabinetId: "c1", status: "dropped", valueBaht: 9999, creditedAt: "2026-07-11T00:00:00.000Z" }),
      // credited แต่นอกช่วงเวลา → ไม่นับเมื่อกรองถึง 31 ก.ค.
      bag({ id: "b5", userId: "u1", cabinetId: "c1", status: "credited", valueBaht: 8888, points: 8888, creditedAt: "2026-08-05T00:00:00.000Z" }),
    ],
  });
}

describe("buildRevenueReport", () => {
  it("รวมเฉพาะถุงที่ credited แล้ว (ข้ามถุง dropped)", () => {
    const rep = buildRevenueReport(sampleDb());
    expect(rep.scope).toBe("all");
    expect(rep.groups).toHaveLength(1);
    // 1000 + 500 + 2000 (+ 8888 เดือน ส.ค. ถ้าไม่กรองก็นับด้วย)
    expect(rep.totals.valueTotal).toBe(1000 + 500 + 2000 + 8888);
    expect(rep.totals.cabinetCount).toBe(2);
  });

  it("กรองช่วงเวลาตาม creditedAt (รวมสิ้นวันของ to)", () => {
    const rep = buildRevenueReport(sampleDb(), { from: "2026-07-01", to: "2026-07-31" });
    // ตัดถุงเดือน ส.ค. (8888) ออก
    expect(rep.totals.valueTotal).toBe(3500);
    const g = rep.groups[0];
    expect(g.rows.find((r) => r.cabinetCode === "AA")!.creditedBags).toBe(2);
    expect(g.rows.find((r) => r.cabinetCode === "BB")!.creditedBags).toBe(1);
  });

  it("ส่วนแบ่งตรงกับ revenueShare(valueTotal, จำนวนตู้)", () => {
    const rep = buildRevenueReport(sampleDb(), { from: "2026-07-01", to: "2026-07-31" });
    const expected = revenueShare(3500, 2);
    expect(rep.groups[0].share).toEqual(expected);
    expect(rep.totals.companyShare).toBe(expected.companyShare);
    expect(rep.totals.franchiseShare).toBe(expected.franchiseShare);
  });

  it("ระบุ franchiseId → scope 'franchise' และเฉพาะแฟรนไชส์นั้น", () => {
    const d = db({
      franchises: [franchise("f1", "GLN"), franchise("f2", "BKK")],
      cabinets: [cabinet("c1", "f1", "AA", "GLN"), cabinet("c2", "f2", "AA", "BKK")],
      bags: [bag({ id: "b1", userId: "u1", cabinetId: "c2", status: "credited", valueBaht: 700, points: 700, creditedAt: "2026-07-10T00:00:00.000Z" })],
    });
    const rep = buildRevenueReport(d, { franchiseId: "f2" });
    expect(rep.scope).toBe("franchise");
    expect(rep.groups).toHaveLength(1);
    expect(rep.groups[0].franchiseCode).toBe("BKK");
    expect(rep.totals.valueTotal).toBe(700);
  });

  it("DB ว่าง → รายงานเป็นศูนย์ ไม่พัง", () => {
    const rep = buildRevenueReport(db());
    expect(rep.groups).toHaveLength(0);
    expect(rep.totals).toMatchObject({ cabinetCount: 0, valueTotal: 0, companyShare: 0, franchiseShare: 0 });
  });
});

describe("csvCell — escape ตามกติกา CSV (regression: ฟิลด์มี , \" ขึ้นบรรทัดใหม่)", () => {
  it("ค่าปกติไม่ต้องครอบ quote", () => {
    expect(csvCell("abc")).toBe("abc");
    expect(csvCell(1234)).toBe("1234");
    expect(csvCell("")).toBe("");
  });
  it("มีลูกน้ำ → ครอบด้วย double quote", () => {
    expect(csvCell("Lotus's, สาขา A")).toBe('"Lotus\'s, สาขา A"');
  });
  it("มี double quote → escape เป็น double-double quote และครอบ", () => {
    expect(csvCell('he said "hi"')).toBe('"he said ""hi"""');
  });
  it("มีขึ้นบรรทัดใหม่ → ครอบด้วย double quote", () => {
    expect(csvCell("บรรทัด1\nบรรทัด2")).toBe('"บรรทัด1\nบรรทัด2"');
  });
});

describe("reportToCsv", () => {
  it("มี BOM นำหน้า (ให้ Excel อ่านไทยถูก) + หัวรายงาน", () => {
    const csv = reportToCsv(buildRevenueReport(sampleDb()));
    expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
    expect(csv).toContain("รายงานรายได้");
    expect(csv.split("\r\n").length).toBeGreaterThan(5);
  });
});
