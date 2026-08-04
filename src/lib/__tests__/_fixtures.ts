/**
 * ตัวช่วยสร้างข้อมูลตัวอย่างสำหรับเทส logic การเงิน (ไม่ใช่ไฟล์เทสเอง)
 * — pattern: field ที่จำเป็นมีค่า default, override เฉพาะที่เกี่ยว
 */
import { emptyDB, type DB } from "../seed";
import type { MeshBag, Cabinet, Franchise, User, PointTxn } from "../types";

const T = "2026-01-01T00:00:00.000Z";

export function db(over: Partial<DB> = {}): DB {
  return { ...emptyDB(), ...over };
}

export function seller(id: string, name = id): User {
  return { id, role: "seller", name, phone: "0800000000", lineConnected: false, createdAt: T };
}

export function franchise(id: string, code: string, name = code): Franchise {
  return { id, code, name, ownerName: `เจ้าของ ${code}`, phone: "0800000000", createdAt: T };
}

export function cabinet(
  id: string,
  franchiseId: string,
  code = "AA",
  franchiseCode = "GLN",
): Cabinet {
  return {
    id,
    code,
    franchiseId,
    franchiseCode,
    name: `จุดตั้ง ${code}`,
    location: { lat: 0, lng: 0, address: "" },
    status: "active",
    createdAt: T,
  };
}

/** ถุง — ต้องระบุ id + userId เป็นอย่างน้อย, ที่เหลือมี default */
export function bag(over: Partial<MeshBag> & Pick<MeshBag, "id" | "userId">): MeshBag {
  return {
    code: "0000001",
    qr: "#TH-AA-0000001",
    cabinetId: "cab-1",
    cabinetCode: "AA",
    userName: "ผู้ขาย",
    status: "dropped",
    droppedAt: "2026-07-15T00:00:00.000Z",
    ...over,
  };
}

export function pointTxn(over: Partial<PointTxn> & Pick<PointTxn, "id" | "userId">): PointTxn {
  return {
    type: "earn",
    points: 0,
    balanceAfter: 0,
    date: "2026-07-15T00:00:00.000Z",
    ...over,
  };
}
